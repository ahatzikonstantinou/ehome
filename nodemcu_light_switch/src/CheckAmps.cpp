#include "CheckAmps.h"
#include "Settings.h"
#include "Relay.h"
#include "MeasureAmps.h"

void CheckAmps::run( Relay &relay, const uint32_t onMillis, const uint32_t offMillis )
{
  int state = relay.state;

  double amps = 0.0;

  // check when off
  relay.off();
  uint32_t start_time = millis();
  unsigned int i = 0;
  while( ( millis()-start_time ) < offMillis )
  {
    i++;
    amps += getAmpsRMS();
  }
  offAmps = amps/i;
  offError = offAmps > relay.offMaxAmpsThreshold;

  // check when on
  relay.on();
  amps = 0.0;
  i = 0;
  start_time = millis();
  while( ( millis()-start_time ) < onMillis )
  {
    i++;
    amps += getAmpsRMS();
  }
  onAmps = amps/i;
  onError = onAmps < relay.onMinAmpsThreshold;

  // restore initial state
  if( state == HIGH )
  {
    relay.off();
  }
  else
  {
    relay.on();
  }
}

bool CheckAmps::check( Relay &relay )
{
  delay( 40 );
  double amps = getAmpsRMS();
  if( relay.state == HIGH ) //off
  {
    offAmps = amps;
    offError = offAmps > relay.offMaxAmpsThreshold;
  }
  else  //on
  {
    onAmps = amps;
    onError = onAmps < relay.onMinAmpsThreshold;
  }
  return !offError && !onError;
}
