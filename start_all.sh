#!/usr/bin/env bash

cd /home/antonis/Projects/ehome/bash

cd check_net_int; if ( ./check_interface.sh > /dev/null 2>&1 & ); then echo "Started check_interface successfully"; else echo "Failed to start check_interface"; fi
cd ../modem; if ( ./modem.sh > /dev/null 2>&1 & ); then echo "Started modem successfully"; else echo "Failed to start modem"; fi
#cd ../sms; if ( ./sms.sh > /dev/null 2>&1 & ); then echo "Started sms successfully"; else echo "Failed to start sms"; fi


cd /home/antonis/Projects/ehome/python

cd mqtt_alarm; if ( ./alarm.py > /dev/null 2>&1 & ); then echo "Started alarm successfully"; else echo "Failed to start alarm"; fi
cd ../mqtt_configuration; if ( ./configuration.py > /dev/null 2>&1 & ); then echo "Started configuration successfully"; else echo "Failed to start configuration"; fi
cd ../mqtt_configuration; if ( ./http_translate.py > /dev/null 2>&1 & ); then echo "Started http_translate successfully"; else echo "Failed to start http_translate"; fi
cd ../mqtt_motionwrapper; if ( ./motionwrapper.py > /dev/null 2>&1 & ); then echo "Started motionwrapper successfully"; else echo "Failed to start motionwrapper"; fi
cd ../mqtt_notifier; if ( ./notifier.py > /dev/null 2>&1 & ); then echo "Started notifier successfully"; else echo "Failed to start notifier"; fi
cd ../xmpp_proxy; if ( ./xmpp_proxy.py > /dev/null 2>&1 & ); then echo "Started xmpp_proxy successfully"; else echo "Failed to start xmpp_proxy"; fi