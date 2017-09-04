#!/usr/bin/env bash

#requires modemmanager, mmcli, jq
#
# valid mqtt messages/commands
#   list: list all modems 
#       e.g. {"cmd":"list"}
#       response: { "modem_list": [{
#                     "id": "3",
#                     "manufacturer": "Samsung Electronics",
#                     "model": "Samsung LTE ALPSS",
#                     "hardware": "gsm-umts",
#                     "state": "locked",
#                     "power": "on",
#                     "mode": "allowed: 2g, 3g; preferred: none\nunknown",
#                     "imei": "353121074205276",
#                     "operator": "WIND GR "
#                     },{
#                     "id": "2",
#                     "manufacturer": "ZTE Incorporated",
#                     "model": "MF195",
#                     "hardware": "gsm-umts",
#                     "state": "disabled",
#                     "power": "on",
#                     "mode": "allowed: 2g, 3g; preferred: 3g",
#                     "imei": "861302000722445",
#                     "operator": "GR COSMOTE"
#                     }]}
#
#   status: publish status of modem 
#       e.g. {"cmd":"status", "params": 3}
#       response: {"modem": {
#                     "id": "3",
#                     "manufacturer": "Samsung Electronics",
#                     "model": "Samsung LTE ALPSS",
#                     "hardware": "gsm-umts",
#                     "state": "locked",
#                     "power": "on",
#                     "mode": "allowed: 2g, 3g; preferred: none\nunknown",
#                     "imei": "353121074205276",
#                     "operator": "WIND GR "
#                     }}
#
#   enable: enables a modem (script must be executed as su or sudo, or else an authentication dialog pops up in ubuntu)
#       e.g. {"cmd":"enable", "params":2}
#       response: {"modem": {
#                     "id": "2",
#                     "manufacturer": "ZTE Incorporated",
#                     "model": "MF195",
#                     "hardware": "gsm-umts",
#                     "state": "registered",
#                     "power": "on",
#                     "mode": "allowed: 2g, 3g; preferred: 3g",
#                     "imei": "861302000722445",
#                     "operator": "GR COSMOTE"
#                     }}
#
#   disable: disables a modem (script must be executed as su or sudo, or else an authentication dialog pops up in ubuntu). Will fail on locaked modems i.e. locked smartphones
#       e.g. {"cmd":"disable", "params":2}
#       response: {"modem": {
#                     "id": "2",
#                     "manufacturer": "ZTE Incorporated",
#                     "model": "MF195",
#                     "hardware": "gsm-umts",
#                     "state": "disabled",
#                     "power": "on",
#                     "mode": "allowed: 2g, 3g; preferred: 3g",
#                     "imei": "861302000722445",
#                     "operator": "unknown"
#                     }}



# set -x

if [[ $EUID -ne 0 ]]; then
    echo "You must be root to run this script"
    exit 1
fi

#read configuration parameters
. "./modem.conf"

declare -A modemInfo

function modemExists {
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        if [[ $modem -eq $1 ]]; then
            return 0
        fi
    done
    return 1
}

function getModemInfo {
    modemInfo[id]="$1"
    modemInfo[manufacturer]=$(mmcli -m "$1" | grep -o "manufacturer: '[^']*" | cut -c16-)
    modemInfo[model]=$(mmcli -m "$1" | grep -o "model: '[^']*" | cut -c9-)
    modemInfo[hardware]=$(mmcli -m "$1" | grep -i -A 6 hardware | grep -o "current: '[^']*" | cut -c11-)
    modemInfo[state]=$(mmcli -m "$1" | grep -v "power" | grep -o "state: '[^']*" | cut -c9-)
    modemInfo[power]=$(mmcli -m "$1" | grep -o "power state: '[^']*" | cut -c15-)
    modemInfo[mode]=$(mmcli -m "$1" | grep -i -A 4 modes | grep -o "current: '[^']*" | cut -c11-)
    modemInfo[imei]=$(mmcli -m "$1" | grep -o "imei: '[^']*" | cut -c8-)
    modemInfo[operator]=$(mmcli -m "$1" | grep -o "operator name: '[^']*" | cut -c17-)
}

function modemInfo2Json {
    j=$(jq -n --arg id "${modemInfo[id]}" --arg manufacturer "${modemInfo[manufacturer]}" --arg model "${modemInfo[model]}" --arg hardware "${modemInfo[hardware]}" --arg state "${modemInfo[state]}" --arg power "${modemInfo[power]}" --arg mode "${modemInfo[mode]}" --arg imei "${modemInfo[imei]}" --arg operator "${modemInfo[operator]}" '{ id: $id, manufacturer:$manufacturer, model:$model, hardware: $hardware, state: $state, power: $power, mode: $mode, imei: $imei, operator: $operator }')
    echo "$j"
}

function status {
    getModemInfo $1
    local j=$( modemInfo2Json )
    mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m '{"modem": '"$j"'}' -q 2
}

function list {
    echo 'In function list'
    local json=""
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        getModemInfo $modem
        if [ -z "$json" ]; then        
            json="$( modemInfo2Json )"
        else    
            json="${json},$( modemInfo2Json )"
        fi
        echo "Now json: $json"
    done
    mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m '{ "modem_list": ['"$json"']}' -q 2
}

function enable {
    mmcli -m $1 -e
    # enabling a modem will be caught by the infinite loop monitor and published
}

function disable {
    mmcli -m $1 -d
    # disabling a modem will be caught by the infinite loop monitor and published
}

#listen for incoming mqtt messages
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
            list)
                echo 'Will execute function list'
                list
                echo 'Executed function list'
                ;;
            status)
                if $(modemExists $params); then
                    status "$params"
                else                
                    echo "Error getting the status of modem $params. Modem does not exist."
                fi
                ;;
            enable)
                if $(modemExists $params); then
                    enable "$params"
                else
                    echo "Error enabling modem $params"
                fi
                ;;
            disable)
                if $(modemExists $params); then
                    disable "$params"
                else
                    echo "Error disabling modem $params"
                fi
                ;;
            *)
                echo "Invalid command"
                ;;
        esac
        sleep 1
    done
)&

declare -A modems
#monitor modems in case a modem changes state or disappears, or a new modem appears
while true; do
    declare currentModems=()
    for modem in $(mmcli -L | grep "Modem" | grep -o "Modem\/[0-9]* " | grep -o "[0-9]*"); do
        currentModems+=($modem)
        getModemInfo $modem
        if [ ${modems[$modem]+_} ]; then 
            # echo "Found";
            stored=${modems[$modem]}
            # echo "$stored"
            # echo "modems[$modem]: ${modems[$modem]}"
            if [[ ${stored[state]} != ${modemInfo[state]} ]]; then
                echo "state of $modem changed from ${stored[state]} to ${modemInfo[state]}"
                modems[$modem]=${modemInfo[state]}
                status "$modem"
            fi
        else 
            echo "Adding new modem";
            modems[$modem]=${modemInfo[state]}
            echo "Modems: ${!modems[@]}"  # Print all keys
            status "$modem"
        fi
    done

    #check if any modems have disappeared and need to be removed
    for modem in "${!modems[@]}"; do
        if [[ ! " ${currentModems[@]} " =~ " ${modem} " ]]; then
            echo "removing modem $modem"
            unset modems[$modem]
            echo "Remaining modems: ${!modems[@]}"  # Print all keys
            list
        fi
    done
    sleep 2
done