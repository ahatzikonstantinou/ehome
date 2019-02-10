#ifndef _checkAmps_h_
#define _checkAmps_h_

 #include <stdint.h>
 #include "Settings.h"
  #include "Relay.h"

// Contains param and methods to measure AmpsRMS when ligth is switched ON and OFF
// in order to checkagainst threshold values of normal operation. Then, if light i.e. relay is
// switched on and AmpsRMS are less than expected, a warning message can be transmitted
// that the light bulb is burnt or missing.
class CheckAmps
{
public:
  double offAmps = 0.0;  //AmpsRMS when light is switced off
  double onAmps = 0.0;   //AmpsRMS when light is switced on
  bool offError = false;
  bool onError = false;

  // switch relay/ligh on and off to measure amps against thresholds
  void run( Relay &relay, const double offMaxAmpsThreshold, const double onMinAmpsThreshold, const uint32_t onMillis = DEFAULT_CHECK_ONMILLIS, const uint32_t offMillis = DEFAULT_CHECK_OFFMILLIS );

  // measure amps and compare against threshold for the current relay state
  bool check( Relay &relay, const double offMaxAmpsThreshold, const double onMinAmpsThreshold );
};

#endif
