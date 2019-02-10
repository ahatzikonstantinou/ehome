#ifndef _calibration_h_
#define _calibration_h_

 #include <stdint.h>
 #include "Settings.h"
 #include "Relay.h"

// Contains param and methods to measure AmpsRMS when ligth is switched ON and OFF
// in order to establish threshold values of normal operation. Then, if light i.e. relay is
// switched on and AmpsRMS are less than expected, a warning message can be transmitted
// that the light bulb is burnt or missing.
class Calibration
{
public:
  double offMaxAmps = 0.0;  //max AmpsRMS when light is switced off
  double onMinAmps = 0.0;   //min AmpsRMS when light is switced on

  void run( Relay &relay, double &offMaxAmpsThreshold, double &onMinAmpsThreshold, const uint32_t onMillis = DEFAULT_CALIBRATE_ONMILLIS, const uint32_t offMillis = DEFAULT_CALIBRATE_OFFMILLIS );
};

#endif
