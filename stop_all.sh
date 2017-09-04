#!/usr/bin/env bash

# Usage. Kills all processes matching variable "targets".
#        Run with stop_all.sh -r in order to report only and not kill any process.

# set -x

reportOnly=$1

declare targets=("check_interface.sh" "modem.sh" "sms.sh" "alarm.py" "configuration.py" "http_translate.py" "motionwrapper.py" "notifier.py" "xmpp_proxy.py") # "mosquitto_sub")
for t in "${targets[@]}"; do
    echo '------------------------------------------------'        
    echo "Searching $t"
    target=$(echo $t | sed 's/\./\\\./g')
    # echo "target=$target"
    # for p in $(ps aux | grep "$target" | grep -v "grep" | tr -s ' ' | cut -d ' ' -f2); do
    for p in $(ps xao pid,args | grep "$target" | grep -v "grep" | tr -s ' ' | cut -d ' ' -f1); do    
        if [ -z "$reportOnly" ] || [[ "$reportOnly" != "-r" ]] ; then
            echo "killing $t process $p";
        else
            echo "reporting $t process $p";
        fi
        # ps aux | grep "$p" | grep -v "grep"
        ps  xao pid,ppid,pgid,sid,comm,args | grep "$p" | grep -v "grep"
        # pkill -P "$p";  #killing children of p
        if [ -z "$reportOnly" ] || [[ "$reportOnly" != "-r" ]] ; then
            kill -TERM "$p";
        fi
    done
done