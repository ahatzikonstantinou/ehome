#!/usr/bin/env bash

# ahat: 
# Note. Although netns in the following script forces a process to use a specific network interface
# all this seems unnecessary since ping can take parameter -I to specify which network interface to use.
# Therefore the current script was abandoned in favour of a much simpler one

set -x

ETH0=$(ifconfig | grep -e "^e.*Ethernet" | cut -d " " -f 1)

NS="ns1"
VETH="veth1"
VPEER="vpeer1"
VETH_ADDR="10.200.1.1"
VPEER_ADDR="10.200.1.2"
RESOLV_DIR="/etc/netns/$NS"
RESOLV_CONF="resolv.conf"
NAMESERVER="8.8.8.8"

if [[ $EUID -ne 0 ]]; then
    echo "You must be root to run this script"
    exit 1
fi

#create a resolv.conf for the namespace, if it does not exist, in order to be able to 
#resolve server names for ipgetter in interface_monitor.py
if [ ! -d ${RESOLV_DIR} ]; then
    mkdir -p ${RESOLV_DIR}
fi
if [ ! -f ${RESOLV_DIR}/${RESOLV_CONF} ]; then
    echo "nameserver $NAMESERVER" > ${RESOLV_DIR}/${RESOLV_CONF}
fi

# Remove namespace if it exists.
ip netns del ${NS} &>/dev/null

# Create namespace
ip netns add ${NS}

# Create veth link.
ip link add ${VETH} type veth peer name ${VPEER}

# Add peer-1 to NS.
ip link set ${VPEER} netns ${NS}

# Setup IP address of ${VETH}.
ip addr add ${VETH_ADDR}/24 dev ${VETH}
ip link set ${VETH} up

# Setup IP ${VPEER}.
ip netns exec ${NS} ip addr add ${VPEER_ADDR}/24 dev ${VPEER}
ip netns exec ${NS} ip link set ${VPEER} up
ip netns exec ${NS} ip link set lo up
ip netns exec ${NS} ip route add default via ${VETH_ADDR}

# Enable IP-forwarding.
echo 1 > /proc/sys/net/ipv4/ip_forward

# Flush forward rules.
iptables -P FORWARD DROP
iptables -F FORWARD
 
# Flush nat rules.
iptables -t nat -F

# Enable masquerading of 10.200.1.0.
iptables -t nat -A POSTROUTING -s ${VETH_ADDR}/24 -o ${ETH0} -j MASQUERADE
 
iptables -A FORWARD -i ${ETH0} -o ${VETH} -j ACCEPT
iptables -A FORWARD -o ${ETH0} -i ${VETH} -j ACCEPT

#instead of getting into namespace check if we are online and bring ppp up
# Get into namespace
#ip netns exec ${NS} /bin/bash --rcfile <(echo "PS1=\"${NS}> \"")

while true; do
    first always check if interface is down before doing any ping tests
    if ! ifconfig "${ETH0}" | grep "inet addr" > /dev/null 2>&1; then
        echo '$ETH0 is down'
        exit 1
    fi

    status=`ip netns exec "$NS" ./ping_interface.sh`
    if [ $? -eq 0 ] 
    # if [ ${status} == "UP" ];
    then
        echo 'interface "$ETH0" is UP'
        exit 0
    else
        echo 'interface "$ETH0" is DOWN'
        exit 1
    fi
    sleep 1
done