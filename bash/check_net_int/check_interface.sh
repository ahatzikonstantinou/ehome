#!/usr/bin/env bash

# set -x

. "./check_interface.conf"    #read configuration parameters

#ETH0 is the interface to check
ETH0=$(ifconfig | grep -e "^e.*Ethernet" | cut -d " " -f 1)
#ALT_INT is the alternative interface to bring up when and while ETH0 is down

echo "ETH0:$ETH0, ALT_INT:$ALT_INT"

(
    while true; do
        mosquitto_sub -k 5 -C 1 -R -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_sub_topic"
        echo "past mosquitto_sub with $?"
        #ahat: Note. ping -I will return a false positive if another interface is up. Therefore use ifconfig and grep
        if ifconfig "${ETH0}" | grep "inet addr" > /dev/null 2>&1; then
            echo "publish $ETH0 is up"
            mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m '{ "type": "'"$primary"'", "primary": true }' -q 2 --will-topic "$mqtt_pub_topic" --will-payload '{ "state": "offline" }' --will-retain --will-qos 2
        elif [ -n "${ALT_INT}" ] && ifconfig "${ALT_INT}" | grep "inet addr" > /dev/null 2>&1; then
            echo "publish $ALT_INT is up"
            mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m '{ "type": "'"$alternative"'", "primary": false }' -r -q 2 --will-topic "$mqtt_pub_topic" --will-payload '{ "state": "offline" }' --will-retain --will-qos 2
        else
            echo "publish NOT_CONNECTED"
            mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -m '{ "type": "NOT_CONNECTED", "primary": true }' -r -q 2 --will-topic "$mqtt_pub_topic" --will-payload '{ "state": "offline" }' --will-retain --will-qos 2
        fi
    done
)&

#The next two flags become true when the corresponding events occurre.
#They become false as soon as the corresponding states are confirmed.
on_disconnect_alt_int=false
on_connect_alt_int=false

while true; do
    if [ -z "${ALT_INT}" ]; then
        # echo "No alternative interface. Nothing to do..."
        sleep 10
        continue
    fi

    # when the event has fired and the mqtt broker is available over the newlly connected interface
    # reset the flag and publish the appropriate mqtt message
    if [ "$on_disconnect_alt_int" = true ] && ( ./ping_interface.sh "$ETH0" > /dev/null 2>&1 ); then
        echo "publish disconnection from ALT_INT"
        on_disconnect_alt_int=false
        sleep 3 #ahat: Note. Without this delay the published message seems to get lost...
        mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -r -m '{ "type": "'"$primary"'", "primary": true }' -q 2 --will-topic "$mqtt_pub_topic" --will-payload '{ "state": "offline" }' --will-retain --will-qos 2
    fi
    if [ "$on_connect_alt_int" = true ] && ( ./ping_interface.sh "$ALT_INT" > /dev/null 2>&1 ); then
        echo "publish connection to ALT_INT"
        on_connect_alt_int=false
        sleep 3 #ahat: Note. Without this delay the published message seems to get lost...
        mosquitto_pub -h "$mqtt_broker" -p "$mqtt_port" -t "$mqtt_pub_topic" -r -m '{ "type": "'"$alternative"'", "primary": false }' -q 2 --will-topic "$mqtt_pub_topic" --will-payload '{ "state": "offline" }' --will-retain --will-qos 2
    fi

    eth0_down=false
    # first always check if interface is down before doing any ping tests
    if ! ifconfig "${ETH0}" | grep "inet addr" > /dev/null 2>&1; then
        echo "$ETH0 is down"
        eth0_down=true
        # exit 1
    else
        status=`./ping_interface.sh $ETH0`
        if [ $? -eq 0 ]; then
            echo "interface $ETH0 is UP"
            eth0_down=false
            # exit 0
        else
            echo "interface $ETH0 is DOWN"
            eth0_down=true
            # exit 1
        fi
    fi

    if [ "$eth0_down" = false ] && ( ifconfig "$ALT_INT" | grep "inet addr" > /dev/null 2>&1 ); then
        echo "Time to bring $ALT_INT down"
        nmcli d disconnect "$ALT_INT"
        on_disconnect_alt_int=true
    elif [ "$eth0_down" = true ] && ! ( ifconfig "$ALT_INT" | grep "inet addr" > /dev/null 2>&1 ); then
        echo "Time to bring $ALT_INT up"
        nmcli d connect "$ALT_INT"
        on_connect_alt_int=true
    fi

    sleep 2
done
