#ifndef _settings_h
#define _settings_h

#include <ESP8266WiFi.h>

#define FIRMWARE "EHome"
#define VERSION "0.1"
#define DEVICE_TYPE "SWITCH1"
#define DEVICE_DOMAIN "SWITCH"

#define PIN_FLASH 1


// It seems that PubSubClient library has a bug. The "loop" function will not send any PING i.e. keepalive requests
// if it is executed without any delay between runs e.g. function loop() { ... client.loop(); }
// However, using the "delay" function is not good practice, therefore a time check is performed in function mqttClientLoop
// and client.loop() is executed only if at least MIN_MQTT_LOOP_MILLIS milliseconds have passed since the previous time
// it was executed.
#define MIN_MQTT_LOOP_MILLIS 10

// The time after which wifimanager shutsdown the portal and nodemcu will restart
#define WIFIMANAGER_PORTAL_TIMEOUT_SECS 120

// When debugging its best to directly define wifi and mqtt parameters
#define USE_WIFIMANAGER 1

// The time after which wifimanager no longer waits for wifi to connect to access point
#define MAX_WIFI_CONNECTION_MILLIS 10000

#endif
