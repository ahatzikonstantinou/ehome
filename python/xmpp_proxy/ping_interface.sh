#!/usr/bin/env bash
#set -x
MAX_TEST_COUNT=3
INT=$1
mapfile < ./ping-sites.txt  #read file in word array
sites=("${MAPFILE[@]}")     #copy as word array
len="${#sites[@]}"

#perform at most as many tests as available ping sites
test_count=$(( len < MAX_TEST_COUNT ? len : MAX_TEST_COUNT ))

# echo "sites:${sites[@]}"
# echo "len: $len"
echo "test_count: $test_count"

tested=()   #array to hold the sites already tested so as not to perform a test on the same site twice

#for s in ${sites}; do
for (( s=0; s<${test_count}; s++ )); do
    ind=$(( RANDOM % len )) #select a radnom site to test

    #if this site has already been tested pick another site
    while true; do
        found=false
        for i in "${tested[@]}"; do
            if [ "$i" -eq "$ind" ]; then
                # echo "$ind has already been tested"
                found=true
                break
            fi
        done
        if [ "$found" = true ]; then
            ind=$(( RANDOM % len ))
        else
            # echo "$ind has not been tested before"
            break
        fi
    done

    tested+=("${ind}")  #store the index of the site so as not to test it again in another iteration

    a="${sites[${ind}]}"
    # echo "$s) site[${ind}]=$a"
    if ping -i 0.2 -c 1 -W 1 -I "${INT}" ${a} > /dev/null 2>&1; then
        echo "online:  ${a}"
        echo "${INT} UP"
        exit 0  #at least on site has responded, the interface must be UP
    else
        echo "offline: ${a}"
    fi
done
#all tests sites were offline. interface must be down
echo "all sites failed to respond"
echo "${INT} DOWN"
exit 1