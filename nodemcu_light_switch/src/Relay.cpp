#include "Relay.h"
#include "Settings.h"
#include <ESP8266WiFi.h>

int Relay::state = INIT_RELAY_STATE;

void Relay::setup()
{
  state = INIT_RELAY_STATE;
  pinMode( RELAY_PIN, OUTPUT );
  digitalWrite( RELAY_PIN, state );
}

int Relay::off()
{
  state = HIGH;  // When the light is connected on the Normally Open contact of the relay, a HIGH will keep the light OFF
  digitalWrite( RELAY_PIN, state );
  return state;
}

int Relay::on()
{
  state = LOW;  // When the light is connected on the Normally Open contact of the relay, a LOW will keep the light ON
  digitalWrite( RELAY_PIN, state );
  return state;
}

int Relay::toggle()
{
  if( state == HIGH )
  {
    state = LOW;
  }
  else
  {
    state = HIGH;
  }
  digitalWrite( RELAY_PIN, state );
  return state;
}
