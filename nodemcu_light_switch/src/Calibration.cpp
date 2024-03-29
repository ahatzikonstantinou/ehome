#include "Calibration.h"
#include "Settings.h"
#include "Relay.h"
#include "MeasureAmps.h"

void Calibration::run( Relay &relay, const uint32_t onMillis, const uint32_t offMillis )
{
  relay.off();
  float amps = 0.0;

  uint32_t start_time = millis();
  while( ( millis()-start_time ) < offMillis )
  {
    amps = getAmpsRMS();
    if( offMaxAmps < amps )
    {
      offMaxAmps = amps;
    }
  }
  relay.offMaxAmpsThreshold = offMaxAmps * OFF_MAX_AMPS_FACTOR;

  relay.on();
  onMinAmps = 1000.0; // initialise to a very large value. If initialised to 0 it will stay at 0 because we are keeping the lower value between previous and current measurement.
  start_time = millis();
  while( ( millis()-start_time ) < onMillis )
  {
    amps = getAmpsRMS();
    if( onMinAmps > amps )
    {
      onMinAmps = amps;
    }
  }
  relay.onMinAmpsThreshold = onMinAmps * ON_MIN_AMPS_FACTOR;

  relay.off();
}
