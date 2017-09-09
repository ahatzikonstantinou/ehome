#!/usr/bin/env bash

#TODO: add code for sms command status
#      update the mqtt message for alarm disarm to use the alarm disarm pin
#
#requires modemmanager, mmcli, jq
#
#supported mqtt commands
#   send: send an sms, 
#         e.g. {"cmd":"send", "params":{ "modem": 2, "to":"123456789", "text": "testing δοκιμή"} } Note: The modem id number is not included in quotes.
#         e.g.2 {"cmd":"send", "params":{ "to":"123456789", "text": "testing δοκιμή"} } If no modem is specified the preferred modem will be used
#         Note: sms messages will be sent with delivery-report=yes. This is the only way to get a time indication regarding when they were sent. The indication will be the timestamp of the corresponding delivery-report. Also note that more than one delivery reports may arrive for the same transmitted sms. They seem to contain the exactly same information, so consider only the latest one.
#   list: list existing sms messages. params: lastSms:the last sms known to the client, updates: sms updates to publish
#         e.g. {"cmd":"list", "params":{ "lastSms":"22f5c2c183d0b91aed23379c52de0930", "updates": ["30d37002fd79e7198112c27f3bbe1821","30d37002fd79e7198112c27f3bbe1821"]} } LastSms and updates are the hashes of the corresponding sms's.
#         Note: It is expected that clients (web app) will ask updates for SMS that have been listed with state "receiving"
#         or "sending" or "unknown" and their state is expected to change to "received" or "sent"
#         Note: field "delivery" will have a value only for sms of type "status-report"
#               field "reference" will have a value (used to associate sms with the same reference value) only for sms of type "status-report" and "submit"
#               field "timestamp" will have a value only for sms of type "deliver" and "status-report"
#         Note: "type": "submit" indicates sms sent by the device, "type": "deliver" indicates sms received by the device (field number must be accordingly interpreted as source/destination), "type": "status-report" indicates sms delivery-report
#         Note: field "state" is not included in the calculation of the hash of an sms, because this field may change (from "receiving" to "received", "sending" to "sent", etc)
#   delete: deletes the specified sms
#           e.g. {"cmd": "delete", "params":{ "smsList": ["22f5c2c183d0b91aed23379c52de0930", "30d37002fd79e7198112c27f3bbe1821"] } } The smsList contains the hashes of the sms to be deleted.
#   allowed_destinations: ask for the allowed sms destinations to be published
#           e.g.: {"cmd":"allowed_destinations"}
#           the reply is e.g. {"allowed_destinations":["+306974931327","6974931327","1202"]}
#
#supported commands in sms text from admins
#   status:     sends an sms containing a summary of the system status (TODO)
#   reboot:     reboots the computer
#   shutdown:   shuts down the computer
#   arm:        arms the alarm
#   disarm:     disarms the alarm

# set -x

processedSmsFile=processedSms.txt

#read configuration parameters
. "./sms.conf"

#command that prints the id numbers of SMS of modem
#mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9*] " | grep -o "[0-9*]"

#command to print the timestamp of an sms
function getTimestamp {
    t=$(mmcli -s "$1" | grep  "timestamp" | grep -o "[0-9]*" | { read dt; date -d "${dt:0:2}-${dt:2:2}-${dt:4:2}T${dt:6:2}:${dt:8:2}:${dt:10:2}" '+%Y-%m-%dT%H:%M:%S%z';})
    echo "$t"
}

function getNumber {
    n=$(mmcli -s "$1" | grep -o "number: '[^']*" | cut -c10-)
    echo "$n"
}

function getText {
    t=$(mmcli -s "$1" | grep -o "text: '[^']*" | cut -c8-)
    echo "$t"
}

function getState {
    s=$(mmcli -s "$1" | grep -o "state: '[^']*" | cut -c9-)
    echo "$s"
}

function getType {
    y=$(mmcli -s "$1" | grep -o "PDU type: '[^']*" | cut -c12-)
    echo "$y"
}

function getReference {
    r=$(mmcli -s "$1" | grep -o "message reference: '[^']*" | cut -c21-)
    echo "$r"
}

function getDelivery {
    d=$(mmcli -s "$1" | grep -o "delivery state: '[^']*" | cut -c18-)
    echo "$d"
}

function getHash {
    local h=$(mmcli -s "$1" | tail -n +2 | grep -v "state:" | md5sum | sed 's/ .*$//g')
    echo "$h"
}

function getJson {
    timestamp=$( getTimestamp "$1" )
    number=$( getNumber "$1" )
    text=$( getText "$1" )
    state=$( getState "$1" )
    type=$( getType "$1" )
    reference=$( getReference "$1" )
    delivery=$( getDelivery "$1" )
    hash=$( getHash "$1" )
    j=$(jq -n --arg id "$1" --arg modem $2 --arg timestamp "$timestamp" --arg number "$number" --arg state "$state" --arg text "$text" --arg type "$type" --arg reference "$reference" --arg delivery "$delivery" --arg hash "$hash" '{modem: $modem, id:$id, timestamp:$timestamp, number: $number, state: $state, text: $text, type: $type, reference: $reference, delivery: $delivery, hash: $hash}')
    echo "$j"
}

function updateLastSms {
    echo -e "last_sms=$1\nlast_state=$2" > "$lastSmsFile"
    echo -n "updated $lastSmsFile: "
    cat "$lastSmsFile"
}

function getPreferredModem {
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        local manufacturer=$(mmcli -m "$modem" | grep -o "manufacturer: '[^']*" | cut -c16-)
        local model=$(mmcli -m "$modem" | grep -o "model: '[^']*" | cut -c9-)
        if [[ "$manufacturer" == "${send_preferred_modem[0]}" ]] && [[ "$model" == "${send_preferred_modem[1]}" ]]; then
            echo "$modem"
            return 0
        fi
    done
    echo ""
}

function send {
    # echo "sms send $1"
    local modem=$( echo "$1" | jq .modem )
    echo "Send. initial modem: $modem"
    if [[ -z "$modem" ]] || [[ "$modem" == "null" ]]; then
        modem=$( getPreferredModem )
        if [[ -z "$modem" ]]; then
            echo "Send does not have a modem, not even a preferred one, send aborted."
            return 1
        else
            echo "Send preferedModem: $modem"
        fi
    fi
    local to=$( echo "$1" | jq .to )
    to="${to:1:-1}"
    echo "With sed: $1" | sed "s/'/_/g" 
    local text=$( echo "$1" | sed "s/'/_/g" | jq '.text' )
    text="${text:1:-1}"
    for a in "${allowed_destinations[@]}"; do
        if [[ "$a" == "$to" ]]; then
            echo "Modem $modem will send to $to text: $text"
            smsParams="text='""$text""', number='""$to""', delivery-report-request=yes"
            echo "smsParams: $smsParams"
            s=$(mmcli -m $modem --messaging-create-sms="$smsParams" | grep -o "SMS\/[0-9]* " | grep -o "[0-9]*")
            if [ -n "$s" ]; then
                mmcli -s "$s" --send
            else
                echo "Failed sending sms $s"
            fi
            return 0
        fi
    done
    echo "Not allowed to send sms to $to"
    return 1
}

function list {
    echo "list params: $1"
    lastSms=$(echo $1 | jq .lastSms)
    lastSms="${lastSms:1:-1}"  #get rid fo the quotes
    # Note. this does not work, I don'tknow why: updates=$(echo "${updates}" | jq -r .[] )    
    #Therefore I convert the json text to a bash command executed with eval to create my array
    updates=$(echo $1 | jq .updates | tr -d ' ' | tr -d '\n' | tr '[' '(' | tr ']' ')' | tr ',' ' ' )
    updatesEval="declare updates=$updates"
    # echo "updatesEval:$updatesEval"
    eval $updatesEval
    # echo "list params: lastSms=$lastSms, updates=${updates[@]}"
    local json=""
    local add=false
    if [ -z "$lastSms" ]; then 
        add=true
    fi
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        for s in $(mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9]* " | grep -o "[0-9]*"); do
            #if the current sms hash is equal to lastSms or is among the ones in 'updates'
            local h=$( getHash $s )            
            if [[ "$h" == "$lastSms" ]]; then
                add=true
            fi
            local addOnce=false
            if [[ " ${updates[@]} " =~ " ${h} " ]]; then
                addOnce=true
            fi

            if [ $add = true ] || [ $addOnce = true ]; then                
                if [ -z "$json" ]; then
                    json="$( getJson $s $modem )"
                else    
                    json="${json},$( getJson $s $modem )"
                fi
            fi
        done
    done
    mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m '{ "existing": ['"$json"'] }' -q 2
}

function status {
    #TODO
    echo "sending sms to $1 with current status"
}

function delete {
    local smsList=$( echo "$1" | jq .smsList )
    smsList=$(echo $1 | jq .smsList | tr -d ' ' | tr -d '\n' | tr '[' '(' | tr ']' ')' | tr ',' ' ' )
    smsListEval="declare smsList=$smsList"
    # echo "smsListEval:$smsListEval"
    eval $smsListEval
    local json=""
    for smsHash in "${smsList[@]}" ; do
        echo "attempting to find and delete sms: $smsHash"
        for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
            for s in $(mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9]* " | grep -o "[0-9]*"); do
                h=$( getHash $s )
                if [[ "$h" == "$smsHash" ]]; then
                    echo "deleting sms $s"
                    mmcli -m "$modem" --messaging-delete-sms="$s"
                    if [ -z "$json" ]; then
                        json='"'"$h"'"'
                    else    
                        json="${json},"'"'"$h"'"'
                    fi
                    break
                fi
            done
        done
    done

    # No need to publish. The deletion of the messages will be picked up by the infinite loop that monitors sms messages
    # message='{"deleted":['"$json"']}'
    # mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m "$message" -q 2
    # echo "$message"
    return 0
}

function allowed_destinations {
    local json=""
    for d in "${allowed_destinations[@]}"; do
        if [ -z "$json" ]; then
            json='"'"$d"'"'
        else    
            json="${json},"'"'"$d"'"'
        fi
    done
    message='{"allowed_destinations":['"$json"']}'
    mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m "$message" -q 2
    echo "$message"
}

function reboot {
    echo "rebooting..."
    # shutdown -r now
}

function shutdown {
    echo "shutting down..."
    # shutdown -h now
}

function armHome {
    echo 'arming (ARM_HOME) the alarm'
    mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_alarm_publish_topic" -m "$mqtt_alarm_arm_home" -q 2
}

function armAway {
    echo 'arming (ARM_AWAY) the alarm'
    mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_alarm_publish_topic" -m "$mqtt_alarm_arm_away" -q 2
}

function arm {
    echo 'arming (ARM) the alarm'
    armAway
}

function disarm {    
    echo 'disarming the alarm. The mqtt message will need to change when the disarm code changes in alarm.py'
    mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_alarm_publish_topic" -m "$mqtt_alarm_disarm" -q 2
}

function unknownCommand {
    echo "replying to $2 with sms via modem $1 reporting unkown command $3"
    local sendParams='{ "modem":'"$1"', "to":"'"$2"'", "text":"'"$3"'"}'
    echo "Send params: $sendParams"
    #ATTENTION! Uncommenting the below line with an empty proccessedSms file
    #i.e. the system is just starting may result in sending a lot of sms!
    #This will happen if there are sms from admins with irrelevant text.
    #Please first check with mmcli -m $modem --messaging-list-sms and mmcli -s $sms to make sure there are no residual sms and delete them or first run this script once with the below line commented out in order to populate proccessedSms file with these sms so that they will not be considered in any next runs. Only then uncomment the following line.
    # send "$sendParams"
}

# if [ ! -e "$lastSmsFile" ]; then
#     echo -e "last_sms=-1\nlast_state=" > "$lastSmsFile"
# fi

#listen for incoming mqtt messages asking to send an sms
(
    while true; do
        message=$(mosquitto_sub -k 5 -C 1 -R -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_sub_topic")
        echo "$message"
        j=$(jq -n --arg cmd "$cmd" --arg params "$params" "$message" )
        # echo "$j"
        cmd=$(echo "$j" | jq .cmd)
        cmd="${cmd:1:-1}"   #get rid of the double quotes because jq returns the double quotes too e.g. "send", "list"
        params=$(echo "$j" | jq .params)
        # echo "cmd:$cmd, params:$params"
        case "$cmd" in
            list)
                list "$params"
                ;;
            send)
                send "$params"
                ;;
            delete)
                delete "$params"
                ;;
            allowed_destinations)
                allowed_destinations
                ;;
            *)
                echo "Invalid command"
                ;;
        esac
        sleep 1
    done
)&

# check sms list to see if new sms received or sent
declare -A smsList=()

# read any save sms from file
if [ -e "$processedSmsFile" ]; then
    . "$processedSmsFile"
else
    declare -p smsList > "$processedSmsFile"
fi


while true; do
    declare currentSmsList=()
    existing=""
    deleted=""
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        # echo "Processing modem $modem"
        for s in $(mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9]* " | grep -o "[0-9]*"); do
            # echo "Processing sms $s"
            addUpdate=false
            h=$( getHash "$s" )
            currentSmsList+=($h)
            state=$( getState "$s" )
            type=$( getType "$s" )

            if [ ${smsList[$h]+_} ] ; then
                storedState=${smsList[$h]}
                if [[ $storedState != $state ]]; then
                    echo "state of sms $s changed from $storedState to $state"
                    addUpdate=true
                # else
                    # echo "skipping sms $s, state is still $state"
                fi
            fi
            if [ ! ${smsList[$h]+_} ] ; then
                echo "new sms $s found"
                addUpdate=true
            fi
            if $addUpdate; then
                smsList[$h]=$state                

                if [ -z "$existing" ]; then
                    existing="$( getJson $s $modem )"
                else    
                    existing="${existing},$( getJson $s $modem )"
                fi
                # echo "$existing"

                # echo "s:$s, number: $number, state:$state"
                number=$(getNumber "$s" )
                if [[ "$type" == "deliver" ]] && [[ "$state" == "received" ]] && [[ " ${admins[@]} " =~ " $number " ]]; then
                    echo "message from admin $number"
                    text=$(getText "$s" )
                    textLow="${text,,}"    #convert to lowercase
                    # echo "lower text: ${text,,}"
                    # echo "upper text: ${text^^}"
                    if [[ " ${textLow[@]} " =~ " status " ]]; then
                        reportStatus "$number"
                    elif [[ " ${textLow[@]} " =~ " reboot " ]]; then
                        reboot
                    elif [[ " ${textLow[@]} " =~ " shutdown " ]]; then
                        shutdown
                    elif [[ " ${textLow[@]} " =~ " arm" ]] && [[ " ${textLow[@]} " =~ "away " ]]; then
                        armAway
                    elif [[ " ${textLow[@]} " =~ " arm" ]] && [[ " ${textLow[@]} " =~ "home " ]]; then
                        armHome
                    elif [[ " ${textLow[@]} " =~ " arm " ]]; then
                        arm
                    elif [[ " ${textLow[@]} " =~ " disarm " ]]; then
                        disarm
                    else
                        unknownCommand "$modem" "$number" "$text"
                    fi
                    # fi
                fi
            fi
        done
    done

    # check if any sms have been deleted and need to be removed from the list too
    for sms in "${!smsList[@]}"; do
        if [[ ! " ${currentSmsList[@]} " =~ " ${sms} " ]]; then
            echo "removing sms $sms"
            unset smsList[$sms]
            if [ -z "$deleted" ]; then
                deleted='"'"$sms"'"'
            else    
                deleted="${deleted},"'"'"$sms"'"'
            fi
            echo "Remaining sms: ${!smsList[@]}"  # Print all keys
        fi
    done

    if [ -n "$existing" ] || [ -n "$deleted" ]  ; then
        #save current sms so as not to reprocess them in future runs if script is stopped and restarted
        declare -p smsList > "$processedSmsFile"
        echo "updated $processedSmsFile"
        
        message='{"existing":['"$existing"'], "deleted":['"$deleted"']}'
        mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m "$message" -q 2
        echo "$message"
    fi

    # echo "sleeping for 5"
    sleep 5
done