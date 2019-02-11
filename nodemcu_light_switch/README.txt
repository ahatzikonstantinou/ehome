According to https://github.com/esp8266/Arduino/issues/1017#issuecomment-156689684
if the wdt reset is triggert the board reboots, when it reboots it is checking the state of GPIO0 and GPIO15 and GPIO2
GPIO15 	GPIO0 	GPIO2 	Mode
0V 	0V 	3.3V 	Uart Bootloader
0V 	3.3V 	3.3V 	Boot sketch
Tried setting GPIO15 to 0V, GPIO0 to 3.3V and GPIO2 to 3.3V in order to ensure that after a crash nodemcu will reboot the sketch but nodemcu does not start or even communicate over usb with the laptop.


NOTE: Over The Air update will not work after uploading firmware to ESP8266 over UART. In such a case do a manual RESET first by pressing the nodemcu RESET button.

NOTE: When the WiFiManager portal times out, it will restart ESP. However, if firmware was uploaded over UART (usb) software restarting will freeze nodemcu. In such a case do a manual RESET  by pressing the nodemcu RESET button, and following restarts will work without a problem.

Discover OTA ready devices by running "pio device list -mdns" from inside a platformio terminal

Usage:
This lightswitch when turned on will attempt to connect to a WiFi network using the last used SSID and password. If the failed attempts exceed a limit it will start a wifi portal waiting for user input (new SSID, password, mqtt params). If the user does not enter any data and portal times out it will attempt again to connect using the last used credentials and so on.
If mqtt disconnects and the failed mqtt-reconnection attempts exceed a limit, the lightswitch will also start a portal in order to get new mqtt param values from the user. If the user does not enter any data and the portal times out, the lightswitch will attempt again to connect using the last used credentials and mqtt param values.
The manual switch, flashbutton, and OTA will work even while a wifi portal is running.
A trigger (low->high rms amps) is ignored if it occurs less than MIN_TRIGGER_MILLIS milliseconds after the previous one.
If a valid trigger occurs less than MAX_TWO_TRIGGER_MILLIS milliseconds after the previous one, it is considered a DOUBLE trigger and the corresponding callback function is executed.
