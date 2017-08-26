#!/usr/bin/env bash

#requires modemmanager, mmcli, jq
#
#supported mqtt commands
#   send: send an sms, 
#         e.g. {"cmd":"send", "params":{ "to":"123456789", "text": "testing δοκιμή"} }
#   publish: publish existing sms messages. params: lastSms:the last sms known to the client, updates: sms numbers to publish
#            e.g. {"cmd":"publish", "params":{ "lastSms":8, "updates": [6,8]} }

# set -x

lastSmsFile=lastSms.txt

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
    timestamp=$( getTimestamp "$s" )
    number=$( getNumber "$s" )
    text=$( getText "$s" )
    state=$( getState "$s" )
    j=$(jq -n --arg index "$s" --arg timestamp "$timestamp" --arg number "$number" --arg state "$state" --arg text "$text" '{index:$index, timestamp:$timestamp, number: $number, state: $state, text: $text}')
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

function publish {
    echo "publish $1"
}

if [ ! -e "$lastSmsFile" ]; then
    echo -e "last_sms=-1\nlast_state=" > "$lastSmsFile"
fi

#listen for incoming mqtt messages asking to send an sms
(
    while true; do
        message=$(mosquitto_sub -k 5 -C 1 -R -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_sub_topic")
        echo "$message"
        j=$(jq -n --arg cmd "$cmd" --arg params "$params" "$message" )
        echo "$j"
        cmd=$(echo "$j" | jq .cmd)
        cmd="${cmd:1:-1}"   #get rid of the double quotes because jq returns the double quotes too e.g. "send", "publish"
        params=$(echo "$j" | jq .params)
        echo "cmd:$cmd, params:$params"
        case "$cmd" in
            send)
                send "$params"
                ;;
            publish)
                publish "$params"
                ;;
            *)
                echo "Invalid command"
                ;;
        esac
        sleep 1
    done
)&

# check sms list to see if new sms received or sent
while true; do
    . "./$lastSmsFile"  #read last sent
    json=""
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9*] " | grep -o "[0-9]"); do
        #TODO check if modem is enabled and if not enable
        #if cannot enable send mqtt message
        #set enabled modem as active
        for s in $(mmcli -m "$modem" --messaging-list-sms | grep -o "SMS\/[0-9*] " | grep -o "[0-9*]"); do
            state=$( getState "$s" )
            if [ "$last_sms" -lt "$s" ] || ( [ "$last_sms" -eq "$s" ] && [ "$last_state" != "$state" ] ); then
                updateLastSms "$s" "$state"
                if [ -z "$json" ]; then
                    json="$( getJson $s )"
                else    
                    json="${json},$( getJson $s )"
                fi
                # echo "$json"
            fi
        done
        if [ -n "$json" ]; then
            mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m "[$json]" -q 2
            echo "[$json]"
        fi
    done
    sleep 1
done