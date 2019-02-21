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
  // analogWriteFreq( frequency );
  // analogWrite( BUZZER_PIN, 0 );
  // delay( duration );
  // analogWrite( BUZZER_PIN, 50 );
  // digitalWrite( BUZZER_PIN, HIGH );

  // digitalWrite( BUZZER_PIN, LOW );
  // delay( duration );
  // digitalWrite( BUZZER_PIN, HIGH );

  // the following lines have failed so far. They generate A continuous tone that never stops.
  // tone( BUZZER_PIN, frequency, duration );
  // delay( duration );
  // noTone( BUZZER_PIN );
}

void Buzzer::playStart()
{
  Serial.println( "playStart" );
  play( 100, 150 );
}

void Buzzer::playSetupFinished()
{
  Serial.println( "playSetupFinished" );
  play( 2000, 500 );
  delay( 500 );
  play( 2000, 500 );
}

void Buzzer::playRestart()
{
  Serial.println( "playRestart" );
  play( 2000, 500 );
  delay( 700 );
  play( 1000, 500 );
}

void Buzzer::playWifiPortalStart()
{
  Serial.println( "playWifiPortalStart" );
  play( 2000, 500 );
  delay( 700 );
  play( 3000, 500 );
}

void Buzzer::playWifiConnected()
{
  Serial.println( "playWifiConnected" );

  play( 3000, 500 );
  delay( 700 );
  play( 3000, 500 );
}

void Buzzer::playMQTTConnected()
{
  Serial.println( "playMQTTConnected" );
  play( 5000, 500 );
  delay( 700 );
  play( 5000, 500 );
}

void Buzzer::playMQTTDisconnected()
{
  Serial.println( "playMQTTDisconnected" );
  play( 15000, 100 );
  delay( 200 );
  play( 1000, 200 );
}
