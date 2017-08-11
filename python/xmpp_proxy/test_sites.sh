#!/usr/bin/env bash
#set -x
INT=$1
mapfile < "$2"  #read file in word array
sites=("${MAPFILE[@]}")     #copy as word array
len="${#sites[@]}"

echo "sites:${sites[@]}"
echo "len: $len"


for s in ${sites[@]}; do
    if ping -c 1 -W 1 -I "${INT}" ${s} > /dev/null 2>&1; then
        echo "online:  ${s}"
    else
        echo "offline: ${s}"
    fi
done
exit 0