#include "Relay.h"
#include "Settings.h"
#include <ESP8266WiFi.h>

void Relay::setup()
{
  pinMode( pin, OUTPUT );
  digitalWrite( pin, state );
}

int Relay::off()
{
  state = HIGH;  // When the light is connected on the Normally Open contact of the relay, a HIGH will keep the light OFF
  digitalWrite( pin, state );
  return state;
}

int Relay::on()
{
  state = LOW;  // When the light is connected on the Normally Open contact of the relay, a LOW will keep the light ON
  digitalWrite( pin, state );
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
  digitalWrite( pin, state );
  return state;
}

bool Relay::isOn()
{
  return state == LOW;
}
