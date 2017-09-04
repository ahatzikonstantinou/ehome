#!/usr/bin/env bash

d=/home/antonis/Projects/ehome/bash

cd $d/check_net_int; if ( ./check_interface.sh > /dev/null 2>&1 & ); then echo "Started check_interface successfully"; else echo "Failed to start check_interface"; fi
cd $d/modem; if ( ./modem.sh > /dev/null 2>&1 & ); then echo "Started modem successfully"; else echo "Failed to start modem"; fi
# cd $d/sms; if ( ./sms.sh > /dev/null 2>&1 & ); then echo "Started sms successfully"; else echo "Failed to start sms"; fi


d=/home/antonis/Projects/ehome/python

# cd $d/mqtt_alarm; if ( ./alarm.py > /dev/null 2>&1 & ); then echo "Started alarm successfully"; else echo "Failed to start alarm"; fi
cd $d/mqtt_configuration; if ( ./configuration.py > /dev/null 2>&1 & ); then echo "Started configuration successfully"; else echo "Failed to start configuration"; fi
cd $d/mqtt_configuration; if ( ./http_translate.py > /dev/null 2>&1 & ); then echo "Started http_translate successfully"; else echo "Failed to start http_translate"; fi
cd $d/mqtt_motionwrapper; if ( ./motionwrapper.py > /dev/null 2>&1 & ); then echo "Started motionwrapper successfully"; else echo "Failed to start motionwrapper"; fi
# cd $d/mqtt_notifier; if ( ./notifier.py > /dev/null 2>&1 & ); then echo "Started notifier successfully"; else echo "Failed to start notifier"; fi
cd $d/xmpp_proxy; if ( ./xmpp_proxy.py > /dev/null 2>&1 & ); then echo "Started xmpp_proxy successfully"; else echo "Failed to start xmpp_proxy"; fi