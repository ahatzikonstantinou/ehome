#include "MeasureAmps.h"
#include "Settings.h"

//ahat: getVPP is from http://henrysbench.capnfatz.com/henrys-bench/arduino-current-measurements/acs712-arduino-ac-current-tutorial/
float getAmpsRMS( uint32_t samples_millis )
{
  double Voltage = 0;
  double VRMS = 0;
  double AmpsRMS = 0;

  float result;

  int readValue;             //value read from the sensor
  int maxValue = 0;          // store max value here
  int minValue = 1024;          // store min value here

  uint32_t start_time = millis();
  while( ( millis()-start_time ) < samples_millis ) //sample for ### milliseconds
  {
    readValue = analogRead( A0 );
    // see if you have a new maxValue
    if (readValue > maxValue)
    {
      /*record the maximum sensor value*/
      maxValue = readValue;
    }
    if ( readValue < minValue )
    {
      /*record the maximum sensor value*/
      minValue = readValue;
    }
  }

  // Subtract min from max
  result = ( ( maxValue - minValue) * 3.3 ) / 1024.0;

  Voltage = result;
  VRMS = ( Voltage / 2.0 ) *0.707;
  AmpsRMS = ( VRMS * 1000 ) / MV_PER_AMP;
  // Serial.print( AmpsRMS );
  // Serial.println( " Amps RMS" );

  return AmpsRMS;
 }
