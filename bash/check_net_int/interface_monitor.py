#!/usr/bin/env python
import ipgetter
import re

""" Checks if wired internet is available by checking for a valid wan ip"""
ip = ipgetter.myip()
validIpAddressRegex = "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$"
result = re.match( validIpAddressRegex, ip )
print( 'online' if result is not None else 'offline' )
exit( 0 if result is not None else 1 )