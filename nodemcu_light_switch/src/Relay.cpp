#include "Relay.h"
#include "Settings.h"
#include <ESP8266WiFi.h>

void Relay::activate()
{
    Relay::active = true;
}
void Relay::deactivate()
{
  Relay::off();
  Relay::active = false;
}

void Relay::setup( const Configuration& configuration )
{
  pinMode( pin, OUTPUT );
  digitalWrite( pin, state );
  offMaxAmpsThreshold = configuration.relay.offMaxAmpsThreshold;
  onMinAmpsThreshold = configuration.relay.onMinAmpsThreshold;
}

int Relay::off()
{
  if( !active ) { return state; }
  state = HIGH;  // When the light is connected on the Normally Open contact of the relay, a HIGH will keep the light OFF
  digitalWrite( pin, state );
  return state;
}

int Relay::on()
{
  if( !active ) { return state; }
  state = LOW;  // When the light is connected on the Normally Open contact of the relay, a LOW will keep the light ON
  digitalWrite( pin, state );
  return state;
}

int Relay::toggle()
{
  if( !active ) { return state; }
  if( state == HIGH )
  {
    state = LOW;
  }
  else
  {
    state = HIGH;
  }
  digitalWrite( pin, state );
  return state;
}
