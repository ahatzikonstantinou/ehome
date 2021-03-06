#ifndef _settings_h
#define _settings_h

#include <ESP8266WiFi.h>

#define FIRMWARE "EHome"
#define VERSION "0.1"
#define DEVICE_TYPE "LIGHT1"
#define DEVICE_DOMAIN "LIGHT"

#define PIN_FLASH 0

// The pin were the relay control input is connected
#define RELAY_PIN D0

#define ON_LED_PIN D4
#define MQTT_LED_PIN D5
#define AP_LED_PIN D7

// The initial state of the relay. The light is connected on the NORMALLY OPEN contact so that
// when power in the house is initially switched on the light will remain OFF. Same for initial
// relay state which is HIGH
#define INIT_RELAY_STATE HIGH

// The default amount of milliseconds to measure when measuring Amps RMS
#define DEFAULT_AMPRMS_MILLIS 50

// For some unknown reason values higher than 1500 e.g. 2000, 3000 etc cause the nodemcu to crash and restart
#define DEFAULT_CALIBRATE_ONMILLIS 1000   //how many millis to keep the light on while calibrating
#define DEFAULT_CALIBRATE_OFFMILLIS 1000  //how many millis to keep the light off while calibrating
#define DEFAULT_CHECK_ONMILLIS 1000   //how many millis to keep the light on while calibrating
#define DEFAULT_CHECK_OFFMILLIS 1000  //how many millis to keep the light off while calibrating

// Millivolts per detected Amp for ACS712 arduino module
// use 66 for 5A Module, 100 for 20A Module and 66 for 30A Module
#define MV_PER_AMP 66

// After calibration mutliply offMaxAmps by this factor to calculate the threshold under which amps are expected to represent a OFF switch
// Choose a factor > 1 to cover scenarios where spikes occur above the calibrated max ampls value
#define OFF_MAX_AMPS_FACTOR 2

// After calibration mutliply onMinAmps by this factor to calculate the threshold above which amps are expected to represent a ON switch
// Choose a factor < 1 to cover scenarios where ON amps dip below the calibrated min amps value
#define ON_MIN_AMPS_FACTOR 0.7

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

// The min time in milliseconds that a difference in current measurments may be considered as a trigger.
// Current will spike once when pressing the pushbutton and also when the relay contacts touch switching on the light
// Trigger only if current jumps high ### millisecs AFTER the last jump, in order to ignore spikes due to light switching on
#define MIN_TRIGGER_MILLIS 500

// The max time between two triggers in order for these two triggers to be considered a toggle of operation mode
#define MAX_TWO_TRIGGER_MILLIS 700

// The time after which wifimanager shutsdown the portal and nodemcu will restart
#define WIFIMANAGER_PORTAL_TIMEOUT_SECS 120

// When debugging its best to directly define wifi and mqtt parameters
#define USE_WIFIMANAGER 1

// When WiFiManager has exceed the maximum number of autoconnect attempts, a fresh attempt will be made to connect with old credentials
#define MAX_WIFIMANAFER_RECONNECTS 3

#endif
