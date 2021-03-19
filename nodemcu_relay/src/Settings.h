#ifndef _settings_h
#define _settings_h

#include <ESP8266WiFi.h>

#define FIRMWARE "EHome"
#define VERSION "0.1"
#define DEVICE_DOMAIN "RELAY"

// see https://randomnerdtutorials.com/esp8266-pinout-reference-gpios/
// to find which pins are preferable for each function
// ahat: since I used all Digital pins I am using GPIO3 for input, since this is Rx and I am using OTA to upload
#define POWER_READER_PIN D2

// The pin were the relay control input is connected
#define RELAY_PIN D1

#define ON_LED_PIN D4
#define AP_LED_PIN D7
#define MQTT_LED_PIN D8

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
// 
// 2147 is the max that nodemcu v2 can sleep. It was found experimentally after looking at the source
// code of ESP.deepSleepMax() and trial & error testing, because Serial.ptintln and String do not
// have uint_64 overloads. Anything larger for deepSleep and ESP8266 will not go to deep sleep.
// ESP32 has a much better max sleep time.
// Sleeping longer than that requires a counter to add separate sleep times until the total sleep 
// time is reached. The counter needs to be updated at every wake up and if the counter value is 
// written in the flash memory it will wear it out (flash memories have about 10,000 write cycles 
// lifetime.) Therefore the counter value should be stored in RTC memory.
#define MAX_SLEEP_SECONDS 2147 // 35,78 min

// define DOUBLE_RELAY if this device controls two relays, which is expected when one light
// fixture houses two light circuits (two gang light)
#define DOUBLE_RELAY

#ifdef DOUBLE_RELAY
#define RELAY2_PIN D6
#define DEVICE_TYPE "RELAY2"
#else
#define DEVICE_TYPE "RELAY1"
#endif


// define WITH_TEMP_SENSOR if this device also has a DHT22 temp sensor
#define WITH_TEMP_SENSOR

#ifdef WITH_TEMP_SENSOR
#define TEMP_PIN D5

// The time in seconds between reading and sending temperature readings when on mains power
#define ON_MAINS_TEMP_REPORT_SECS 5

// The time in seconds between reading and sending temperature readings when on battery
#define ON_BATTERY_TEMP_REPORT_SECS 8

#endif

#define BLINK_OTA_ON_MSECS 600
#define BLINK_OTA_OFF_MSECS 500
#define BLINK_UPLOAD_OTA_ON_MSECS 300
#define BLINK_UPLOAD_OTA_OFF_MSECS 200

#endif
