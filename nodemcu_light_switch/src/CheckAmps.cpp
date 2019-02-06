#include "CheckAmps.h"
#include "Settings.h"
#include "Relay.h"
#include "MeasureAmps.h"

void CheckAmps::run( const double offMaxAmpsThreshold, const double onMinAmpsThreshold, uint32_t onMillis, uint32_t offMillis )
{
  int state = Relay::state;

  double amps = 0.0;

  // check when off
  Relay::off();
  uint32_t start_time = millis();
  unsigned int i = 0;
  while( ( millis()-start_time ) < offMillis )
  {
    i++;
    amps += getAmpsRMS();
  }
  offAmps = amps/i;
  offError = offAmps > offMaxAmpsThreshold;

  // check when on
  Relay::on();
  amps = 0.0;
  i = 0;
  start_time = millis();
  while( ( millis()-start_time ) < onMillis )
  {
    i++;
    amps = getAmpsRMS();
  }
  onAmps = amps/i;
  onError = onAmps < onMinAmpsThreshold;

  // restore initial state
  if( state == HIGH )
  {
    Relay::off();
  }
  else
  {
    Relay::on();
  }
}

bool CheckAmps::check( const double offMaxAmpsThreshold, const double onMinAmpsThreshold )
{
  delay( 40 );
  double amps = getAmpsRMS();
  if( Relay::state == HIGH ) //off
  {
    offAmps = amps;
    offError = offAmps > offMaxAmpsThreshold;
  }
  else  //on
  {
    onAmps = amps;
    onError = onAmps < onMinAmpsThreshold;
  }
}
