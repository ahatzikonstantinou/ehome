#include "Calibration.h"
#include "Settings.h"
#include "Relay.h"
#include "MeasureAmps.h"

void Calibration::run( uint32_t onMillis, uint32_t offMillis )
{
  Relay::off();
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

  Relay::on();
  start_time = millis();
  while( ( millis()-start_time ) < onMillis )
  {
    amps = getAmpsRMS();
    if( onMinAmps > amps )
    {
      onMinAmps = amps;
    }
  }
}
