#ifndef _measureamps_h_
#define _measureamps_h_

#include <ESP8266WiFi.h>
 #include "Settings.h"

float getAmpsRMS( uint32_t samples_millis = DEFAULT_AMPRMS_MILLIS );

#endif
