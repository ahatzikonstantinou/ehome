#!/usr/bin/env bash

#requires modemmanager, mmcli, jq
#
#supported mqtt commands
#   send: send an sms, 
#         e.g. {"cmd":"send", "params":{ "to":"123456789", "text": "testing δοκιμή"} }
#   list: list existing sms messages. params: lastSms:the last sms known to the client, updates: sms numbers to publish
#            e.g. {"cmd":"list", "params":{ "lastSms":8, "updates": [6,8]} }
#         It is expected that clients (web app) will ask updates for SMS that have been listed with state "receiving"
#         or "sending" and their state is expected to change to "received" or "sent"
#
#supported commands in sms text from admins
#   status: sends an sms containing a summary of the system status (TODO)
#   reboot: reboots the computer
#   shutdown:   shuts down the computer

# set -x

# lastSmsFile=lastSms.txt
processedSmsFile=processedSmsFile.txt

#read configuration parameters
. "./sms.conf"

#command that prints the id numbers of SMS of modem
#mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9*] " | grep -o "[0-9*]"

#command to print the timestamp of an sms
function getTimestamp {
    t=$(mmcli -s "$1" | grep  "timestamp" | grep -o "[0-9]*" | { read dt; date -Ins -d "${dt:0:2}-${dt:2:2}-${dt:4:2}T${dt:6:2}:${dt:8:2}:${dt:10:5}";})
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

function getJson {
    timestamp=$( getTimestamp "$1" )
    number=$( getNumber "$1" )
    text=$( getText "$1" )
    state=$( getState "$1" )
    j=$(jq -n --arg index "$1" --arg modem $2 --arg timestamp "$timestamp" --arg number "$number" --arg state "$state" --arg text "$text" '{modem: $modem, index:$index, timestamp:$timestamp, number: $number, state: $state, text: $text}')
    echo "$j"
}

function updateLastSms {
    echo -e "last_sms=$1\nlast_state=$2" > "$lastSmsFile"
    echo -n "updated $lastSmsFile: "
    cat "$lastSmsFile"
}

function send {
    echo "sms send $1"
    to=$( echo "$1" | jq .to )
    to="${to:1:-1}"
    text=$( echo "$1" | jq .text )
    text="${text:1:-1}"
    for a in "${allowed_destinations[@]}"; do
        if [[ "$a" == "$to" ]]; then
            echo "Sending to $to text:$text"
            
            return 0
        fi
    done
    echo "Not allowed to send sms to $to"
    return 1
}

function list {
    echo "list params: $1"
    lastSms=$(echo $1 | jq .lastSms)
    # Note. this does not work, I don'tknow why: updates=$(echo "${updates}" | jq -r .[] )    
    #Therefore I convert the json text to a bash command executed with eval to create my array
    updates=$(echo $1 | jq .updates | tr -d ' ' | tr -d '\n' | tr '[' '(' | tr ']' ')' | tr ',' ' ' )
    updatesEval="declare updates=$updates"
    # echo "updatesEval:$updatesEval"
    eval $updatesEval
    # echo "list params: lastSms=$lastSms, updates=${updates[@]}"
    local json=""
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        for s in $(mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9]* " | grep -o "[0-9]*"); do
            #if the current sms index is larger than lastSms or is among the ones in 'updates'
            if [[ "$s" -gt "$lastSms" ]] || [[ " ${updates[@]} " =~ " ${s} " ]]; then
                if [ -z "$json" ]; then
                    json="$( getJson $s $1 )"
                else    
                    json="${json},$( getJson $s $1 )"
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
    #TODO
    echo "deleting sms $1"    
}

function reboot {
    #TODO
    echo "rebooting..."
}

function shutdown {
    #TODO
    echo "shutting down..."
}

function unknownCommand {
    #TODO
    echo "replying to $1 with sms reporting unkown command $2"
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
            *)
                echo "Invalid command"
                ;;
        esac
        sleep 5
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


# smsList=( [1]="received" [2]="sent" [64]="receiving" ) #testing
while true; do
    declare currentSmsList=()
    # . "./$lastSmsFile"  #read last sent
    existing=""
    deleted=""
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        # echo "Processing modem $modem"
        for s in $(mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9]* " | grep -o "[0-9]*"); do
            # echo "Processing sms $s"
            addUpdate=false
            currentSmsList+=($s)
            state=$( getState "$s" )

            if [ ${smsList[$s]+_} ] ; then
                storedState=${smsList[$s]}
                if [[ $storedState != $state ]]; then
                    echo "state of sms $s changed from $storedState to $state"
                    addUpdate=true
                # else
                    # echo "skipping sms $s, state is still $state"
                fi
            fi
            if [ ! ${smsList[$s]+_} ] ; then
                echo "new sms $s found"
                addUpdate=true
            fi
            if $addUpdate; then
                # echo "last_sms: $last_sms, s: $s"
                # if [ "$last_sms" -lt "$s" ] || ( [ "$last_sms" -eq "$s" ] && [ "$last_state" != "$state" ] ); then
                #     updateLastSms "$s" "$state"
                # fi
                smsList[$s]=$state                

                # updateLastSms "$s" "$state"
                if [ -z "$existing" ]; then
                    existing="$( getJson $s $modem )"
                else    
                    existing="${existing},$( getJson $s $modem )"
                fi
                # echo "$existing"

                # echo "s:$s, number: $number, state:$state"
                number=$(getNumber "$s" )
                if [[ "$state" == "received" ]] && [[ " ${admins[@]} " =~ " $number " ]]; then
                    echo "message from admin $number"
                    text=$(getText "$s" )
                    text="${text,,}"    #convert to lowercase
                    # echo "lower text: ${text,,}"
                    # echo "upper text: ${text^^}"
                    if [[ " ${text[@]} " =~ " status " ]]; then
                        reportStatus "$number"
                    elif [[ " ${text[@]} " =~ " reboot " ]]; then
                        reboot
                    elif [[ " ${text[@]} " =~ " shutdown " ]]; then
                        shutdown
                    else
                        unknownCommand "$number" "$text"
                    fi
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
                deleted='{ "index": "'"$sms"'" }'
            else    
                deleted="${deleted},"'{ "index": "'"$sms"'" }'
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