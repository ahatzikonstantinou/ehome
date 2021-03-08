#ifndef _settings_h
#define _settings_h

#include <ESP8266WiFi.h>

#define FIRMWARE "EHome"
#define VERSION "0.1"
#define DEVICE_DOMAIN "RELAY"

// see https://randomnerdtutorials.com/esp8266-pinout-reference-gpios/
// to find which pins are preferable for each function
#define POWER_READER_PIN D5

// The pin were the relay control input is connected
#define RELAY_PIN D1

#define ON_LED_PIN D6
#define MQTT_LED_PIN D7
#define AP_LED_PIN D8

// The initial state of the relay. The light is connected on the NORMALLY OPEN contact so that
// when mains power in the house is initially switched on the light will remain OFF. Same for initial
// relay state which is HIGH
#define INIT_RELAY_STATE HIGH

// It seems that PubSubClient library has a bug. The "loop" function will not send any PING i.e. keepalive requests
// if it is executed without any delay between runs e.g. function loop() { ... client.loop(); }
// However, using the "delay" function is not good practice, therefore a time check is performed in function mqttClientLoop
// and client.loop() is executed only if at least MIN_MQTT_LOOP_MILLIS milliseconds have passed since the previous time
// it was executed.
#define MIN_MQTT_LOOP_MILLIS 10

// The min time in milliseconds between mqtt reconnect attempts
#define MIN_MQTT_RECONNECT_MILLIS 5000

// The maximum number of mqtt reconnect attempts. If this number is exceeded nodemcu will call WiFiManageWrapper to become an AP
// and get new values
#define MAX_MQTT_RECONNECT_ATTEMPTS 3

// The time after which wifimanager shutsdown the portal and nodemcu will restart
#define WIFIMANAGER_PORTAL_TIMEOUT_SECS 120

// When debugging its best to directly define wifi and mqtt parameters
#define USE_WIFIMANAGER 1

// The time after which wifimanager no longer waits for wifi to connect to access point
#define MAX_WIFI_CONNECTION_MILLIS 10000

// The time that the device will "sleep" i.e. it will wait before sending a "I am alive"
// configuration message. Note that if a user presses the reset button and the device restarts
// the deep sleep timer is effectively reset.
// 12600 is the max that ESP8266 can sleep. Sleeping longer than that requires a counter
// to add separate sleep times until the total sleep time is reached. The counter needs
// to be updated at every wake up and if the counter value is written in the flash memory
// it will wear it out (flash memories have about 10,000 write cycles lifetime.) Therefore
// the counter value should be stored in RTC memory
#define MAX_SLEEP_SECONDS 12600 //3:30h se

// define DOUBLE_RELAY if this device controls two relays, which is expected when one light
// fixture houses two light circuits (two gang light)
#define DOUBLE_RELAY

#ifdef DOUBLE_RELAY
#define RELAY2_PIN D2
#define DEVICE_TYPE "RELAY2"
#else
#define DEVICE_TYPE "RELAY1"
#endif

#endif