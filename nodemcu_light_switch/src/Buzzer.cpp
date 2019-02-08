#include "Settings.h"
#include <Arduino.h>
#include "Buzzer.h"

void Buzzer::setup()
{
  // The following lines have failed. They generate A continuous tone that never stops.
  // pinMode( BUZZER_PIN, OUTPUT );
  // digitalWrite( BUZZER_PIN, HIGH );
}

void Buzzer::play( unsigned int frequency, uint32_t duration )
{
  // all the following lines have failed so far. They generate A continuous tone that never stops.
  // analogWriteFreq( frequency );
  // analogWrite( BUZZER_PIN, 500 );
  // delay( duration );
  // analogWrite( BUZZER_PIN, 0 );
  // digitalWrite( BUZZER_PIN, HIGH );
  // delay( duration );
  // digitalWrite( BUZZER_PIN, LOW );
  // tone( BUZZER_PIN, frequency, duration );
  // delay( duration );
  // noTone( BUZZER_PIN );
}

void Buzzer::playStart()
{
  play( 1000, 1000 );
}

void Buzzer::playSetupFinished()
{
  play( 2000, 500 );
  delay( 500 );
  play( 2000, 500 );
}

void Buzzer::playRestart()
{
  play( 2000, 500 );
  delay( 700 );
  play( 1000, 500 );
}

void Buzzer::playWifiPortalStart()
{
  play( 2000, 500 );
  delay( 700 );
  play( 3000, 500 );
}

void Buzzer::playWifiConnected()
{
  play( 3000, 500 );
  delay( 700 );
  play( 3000, 500 );
}

void Buzzer::playMQTTConnected()
{
  play( 5000, 500 );
  delay( 700 );
  play( 5000, 500 );
}

void Buzzer::playMQTTDisconnected()
{
  play( 5000, 500 );
  delay( 700 );
  play( 3000, 500 );
}
