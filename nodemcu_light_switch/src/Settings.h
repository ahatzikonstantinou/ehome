#ifndef _settings_h
#define _settings_h

#include <ESP8266WiFi.h>

//The pin were the relay control input is connected
#define RELAY_PIN D0

//The initial state of the relay. The light is connected on the NORMALLY OPEN contact so that
//when power in the house is initially switched on the light will remain OFF. Same for initial
//relay state which is HIGH
#define INIT_RELAY_STATE HIGH

//The default amount of milliseconds to measure when measuring Amps RMS
#define DEFAULT_AMPRMS_MILLIS 20

#define DEFAULT_CALIBRATE_ONMILLIS 1000   //how many millis to keep the light on while calibrating
#define DEFAULT_CALIBRATE_OFFMILLIS 1000  //how many millis to keep the light off while calibrating

// Millivolts per detected Amp for ACS712 arduino module
// use 66 for 5A Module, 100 for 20A Module and 66 for 30A Module
#define MV_PER_AMP 66

#endif
