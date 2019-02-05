#include <FS.h> //for WiFiManager this needs to be first, or it all crashes and burns...

#include <ESP8266WiFi.h>
#include <PubSubClient.h>

//needed for library
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include <ArduinoJson.h>  //https://github.com/bblanchon/ArduinoJson
#include <WiFiManager.h>  //https://github.com/tzapu/WiFiManager

#include "Settings.h"
//#define RELAY_PIN D0

#include "Relay.h"
// int relayState = HIGH;  // When the light is connected on the Normally Open contact of the relay, a LOW will keep the light initially switched off

#include "MeasureAmps.h"

// default values
const char* ssid = "ST-VIRUS";
const char* password = "ap2109769675ap";
char mqtt_server[40];
char mqtt_port[6];
char publish_topic[256];
char subscribe_topic[256];

WiFiClient espClient;
PubSubClient client( espClient );


bool mqttReconnect()
{
  if( !client.connected() )
  {
    Serial.print( "Attempting MQTT connection..." );
    // Attempt to connect
    if( client.connect( "ESP8266 Client" ) )
    {
      Serial.println( "connected" );
      // ... and subscribe to topic
      client.subscribe( subscribe_topic );
    }
    else
    {
      return false;
    }
  }
  client.loop();
  return true;
}

void mqttPublish( String sensorName, char* message )
{
    if( client.connected() )
    {
      String topic = publish_topic + String( "/" ) + sensorName;
      char _topic[ sizeof( topic ) + 1 ]; topic.toCharArray( _topic, sizeof( _topic ) + 1 ) ;
      Serial.printf( "Publishing: [%s] ", _topic );
      Serial.println( message );
      client.publish( _topic, message );
    }
    else
    {
      Serial.println( "Cannot publish because client is not connected." );
    }
}

void callback( char* topic, byte* payload, unsigned int length)
{
  Serial.print( "Message arrived [" );
  Serial.print( topic );
  Serial.print( "] " );
  for (unsigned int i=0;i<length;i++)
  {
    char receivedChar = (char)payload[i];
    Serial.print(receivedChar);
    // if (receivedChar == '0')
    // {
    //   // ESP8266 outputs are "reversed"
    //   digitalWrite( PIN_LED, HIGH );
    // }
    // if (receivedChar == '1')
    // {
    //   digitalWrite( PIN_LED, LOW );
    // }
  }
  Serial.println();
}

void mqttSetup()
{
  // Serial.printf( "Will try to read mqtt_port %s in a String\n", mqtt_port );
  String port( mqtt_port );
  // Serial.printf( "Will try to set mqtt server to %s and port to %d\n", mqtt_server, port.toInt() );
  client.setServer( mqtt_server, port.toInt() );
  // Serial.printf( "Will try to set mqtt callback\n" );
  client.setCallback( callback );
}

void setup()
{
  Serial.begin( 115200 );
  wifi_set_sleep_type( NONE_SLEEP_T );

  Relay::setup();
  // pinMode( RELAY_PIN, OUTPUT );
  // digitalWrite( RELAY_PIN, relayState );
  Serial.println( "relay setup finished" );

  // mqttSetup();
  // Serial.println( "mqttSetup finished" );
}

// void toggleRelay()
// {
//   if( relayState == HIGH )
//   {
//     relayState = LOW;
//   }
//   else
//   {
//     relayState = HIGH;
//   }
//   digitalWrite( RELAY_PIN, relayState );
// }

int mVperAmp = 66; // use 100 for 20A Module and 66 for 30A Module


//ahat: getVPP is from http://henrysbench.capnfatz.com/henrys-bench/arduino-current-measurements/acs712-arduino-ac-current-tutorial/
float getVPP( uint16 samples_millis )
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
  AmpsRMS = ( VRMS * 1000 ) / mVperAmp;
  // Serial.print( AmpsRMS );
  // Serial.println( " Amps RMS" );

  return AmpsRMS;
 }

double lastAmps = 0;
bool firstRun = true;
uint32_t last_trigger = millis();

double lowMaxAmp = 0.15;
double highMinAmp = 0.25;

void loop()
{
  // check Amp and toggle relay accordingly
  double currentAmps = getAmpsRMS(); //getVPP( 20 );
  if( !firstRun )
  {
    // if( ( lastAmps * 1.5 ) < currentAmps )
    // if( ( relayState == HIGH && lastAmps * 4 < currentAmps ) || //transition from OFF to ON
    //     ( relayState == LOW && lastAmps > currentAmps * 8 )   //transition from ON to OFF
    //   )
    // if( ( relayState == HIGH && currentAmps > lowMaxAmp) || //transition from OFF to ON
    //     ( relayState == LOW && currentAmps < highMinAmp )   //transition from ON to OFF
    //   )
    if( ( Relay::state == HIGH && currentAmps > lowMaxAmp) || //transition from OFF to ON
        ( Relay::state == LOW && currentAmps < highMinAmp )   //transition from ON to OFF
      )
    {

      // current will jump high once when pressing the pushbutton and also when switching on the light (/relay)
      //switch only if current jumps high ### millisecs AFTER the last jump, in order to ignore spikes due to light switching on
      uint32_t trigger = millis();
      if( trigger > last_trigger + 500 )
      {
        Serial.print( "   Trigger!" );
        Relay::toggle(); //toggleRelay();
        last_trigger = trigger;
      }
      else
      {
        Serial.print( "   ignored trigger." );
      }
      Serial.print( ", lastAmps = " + String( lastAmps ) );
      Serial.println( ", currentAmps = " + String( currentAmps ) );
    }
  }
  else
  {
    Serial.println( "firstRun = true" );
    firstRun = false;
  }
  lastAmps = currentAmps;

  // mqttReconnect();

  // delay( 100 );
}
