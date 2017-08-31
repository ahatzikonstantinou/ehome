#!/usr/bin/env bash

# set -x

declare targets=("check_interface.sh" "modem.sh" "sms.sh" "alarm.py" "configuration.py" "http_translate.py" "motionwrapper.py" "notifier.py" "xmpp_proxy.py")
for t in "${targets[@]}"; do
    echo "Searching $t for killing"
    target=$(echo $t | sed 's/\./\\\./g')
    # echo "target=$target"
    for p in $(ps aux | grep "$target" | tr -s ' ' | cut -d ' ' -f2); do 
        echo "killing $t process $p";
        ps aux | grep "$p" | grep -v "grep"
        kill -9 "$p";
    done
done