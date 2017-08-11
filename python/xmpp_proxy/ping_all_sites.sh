#!/usr/bin/env bash
#set -x
mapfile < ./ping-sites.txt  #read file in word array
sites=("${MAPFILE[@]}")     #copy as word array
len="${#sites[@]}"


# echo "sites:${sites[@]}"
echo "len: $len"

for s in "${sites[@]}"; do
    if ping -c 1 ${s} > /dev/null 2>&1; then
        echo "online:  ${s}"
    else
        echo "offline: ${s}"
    fi
done
