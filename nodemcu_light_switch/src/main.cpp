/*
 * Ahat:
 * IMPORTANT NOTES
 * The PubSubClient library has a continuous disconnect - reconnect bug. In order to correct this addr
 * "delay(10);" immediately after "if (connected()) {" in function "boolean PubSubClient::loop()"
 * In order to accommodate larger mqtt messages such as the ones including check errors, increase
 * MQTT_MAX_PACKET_SIZE to 1024 in PubSubClient.h
 */

#include <FS.h> //for WiFiManager this needs to be first, or it all crashes and burns...

#include <ESP8266WiFi.h>
#include <PubSubClient.h>

//needed for library
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include <ArduinoJson.h>  //https://github.com/bblanchon/ArduinoJson
#include <WiFiManager.h>  //https://github.com/tzapu/WiFiManager

#include "Settings.h"
#include "Relay.h"
#include "MeasureAmps.h"
#include "Calibration.h"
#include "CheckAmps.h"

#define TRIGGER_MANUAL 0
#define TRIGGER_WIFI 1
#define TRIGGER_CALIBRATION 2
#define TRIGGER_CHECK 3

char trigger; // holds a value indicating whether the last trigger was manual or wifi

String triggerToStr()
{
  String text = "";
  if( trigger == TRIGGER_MANUAL )
  {
    text = "manual";
  }
  else if( trigger == TRIGGER_WIFI )
  {
    text = "wifi";
  }
  else if( trigger == TRIGGER_CALIBRATION )
  {
    text = "calibration";
  }

  return text;

}

//The following values were good thresholds when using a 60W incadescent light bulb
double offMaxAmpsThreshold = 0.15;
double onMinAmpsThreshold = 0.25;


//Static IP address configuration
IPAddress staticIP(192, 168, 1, 33); //ESP static ip
IPAddress gateway(192, 168, 1, 1);   //IP Address of your WiFi Router (Gateway)
IPAddress subnet(255, 255, 255, 0);  //Subnet mask
IPAddress dns(192, 168, 1, 1);  //DNS


const char* deviceName = "wifi-light";

// default values
const char* ssid = "ST-VIRUS";
const char* password = "ap2109769675ap";
// char mqtt_server[40];
// char mqtt_port[6];
// char publish_topic[256];
// char subscribe_topic[256];
const char* mqtt_server = "192.168.1.31";
const char* mqtt_port = "1883";
const char* publish_topic = "L/state";
const char* subscribe_topic = "L/set";

WiFiClient espClient;
PubSubClient client( espClient );

uint32_t lastReconnect = 0;

CheckAmps setRelay( bool on )
{
  if( on )
  {
    Relay::on();
  }
  else
  {
    Relay::off();
  }
  CheckAmps c;
  c.check( offMaxAmpsThreshold, onMinAmpsThreshold );

  //If the light bulb is burnt or missing switch the Relay back to off, because any
  //consecutive low current amp measurement will be considered a trigger if the Relay::state is LOW
  if( c.onError )
  {
    Serial.println( "There was an error switching the Relay on!" );
    Relay::off();
  }
  return c;
}

bool mqttReconnect()
{
  // int state = client.state();
  uint32_t start = millis();
  if( !client.connected() && start - lastReconnect > 5000 )
  // if( state != 0 && state != -3 )
  {
    Serial.print( "Client rc=" + String( client.state() ) + ", " );
    Serial.print( "Attempting MQTT connection..." );
    // Create a random client ID
    String clientId = String( deviceName ) + "-";
    // clientId += String(random(0xffff), HEX);
    // Attempt to connect
    if( client.connect( clientId.c_str() ) )
    {
      Serial.println( "connected, rc=" + String( client.state() ) );
      // ... and subscribe to topic
      client.subscribe( subscribe_topic );
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // // Wait 5 seconds before retrying
      // delay(5000);
      return false;
    }
  }
  return true;
}

void mqttPublish( String message )
{
    if( client.connected() )
    {
      Serial.print( "Publishing: " + String( publish_topic ) );
      Serial.println( message );
      // Serial.println( "sizeof message: " + String( sizeof( message ) ) );

      char _msg[ message.length() + 1 ];  // note: sizeof( message ) will give the wrong size, use message.length() instead
      memset(&_msg[0], 0, sizeof(_msg));
      message.toCharArray( _msg, sizeof( _msg ) ) ;
      Serial.println( _msg );

      client.publish( publish_topic, _msg );
    }
    else
    {
      Serial.println( "Cannot publish because client is not connected." );
    }
}

void mqttPublishReport( CheckAmps c )
{
  String msg(
    String( "{ \"state\": \"" ) + ( Relay::state == HIGH ? "OFF" : "ON" ) +
    "\", \"trigger\": \"" + triggerToStr() +
    "\", \"offMaxAmpsThreshold\": " + String( offMaxAmpsThreshold ) +
    ", \"onMinAmpsThreshold\": " + String( onMinAmpsThreshold ) +
    ", \"offAmps\": " + String( c.offAmps ) +
    ", \"offError\": " + ( c.offError ? "true" : "false" ) +
    ", \"onAmps\": " + String( c.onAmps ) +
    ", \"onError\": " + ( c.onError ? "true" : "false" ) +
  " }" );
  mqttPublish( msg );
}

void mqttPublishReport()
{
  String msg( String( "{ \"state\": \"" ) + ( Relay::state == HIGH ? "OFF" : "ON" ) + "\", \"trigger\": \"" + triggerToStr() + "\", \"offMaxAmpsThreshold\": " + String( offMaxAmpsThreshold ) + ", \"onMinAmpsThreshold\": " + String( onMinAmpsThreshold ) + " }" );
  mqttPublish( msg );
}

uint32_t last_trigger = millis();

void callback( char* topic, byte* payload, unsigned int length)
{
  Serial.print( "Message arrived [" );
  Serial.print( topic );
  Serial.print( "] " );

  // set last_trigger to avoid follow-on triggers as the current may spike again once the relay changes state
  last_trigger = millis();

  for (unsigned int i=0;i<length;i++)
  {
    char receivedChar = (char)payload[i];
    Serial.println(receivedChar);
    if( receivedChar == '0' )
    {
      CheckAmps c = setRelay( false );
      trigger = TRIGGER_WIFI;
      mqttPublishReport( c );
    }
    else if( receivedChar == '1' )
    {
      CheckAmps c = setRelay( true );
      trigger = TRIGGER_WIFI;
      mqttPublishReport( c );
    }
    else if( receivedChar == 'l' )
    {
      //calibrate
      trigger = TRIGGER_CALIBRATION;
      Serial.println( "Before calibration: offMaxAmpsThreshold = " + String( offMaxAmpsThreshold ) + ", onMinAmpsThreshold = " + String( onMinAmpsThreshold ) );
      Serial.println( "Calibrating..." );
      Calibration c;
      c.run( offMaxAmpsThreshold, onMinAmpsThreshold );
      // set last_trigger again to avoid follow-on triggers because calibration lasts longer than the min allowed time between triggers
      last_trigger = millis();

      Serial.println( "After calibration: offMaxAmpsThreshold = " + String( offMaxAmpsThreshold ) + ", onMinAmpsThreshold = " + String( onMinAmpsThreshold ) );
      mqttPublishReport();
    }
    else if( receivedChar == 'r' )
    {
      //report
      mqttPublishReport();
    }
    else if( receivedChar == 'c' )
    {
      //check
      trigger = TRIGGER_CHECK;
      Serial.println( "Checking..." );
      CheckAmps c;
      c.run( offMaxAmpsThreshold, onMinAmpsThreshold );
      // set last_trigger again to avoid follow-on triggers because calibration lasts longer than the min allowed time between triggers
      last_trigger = millis();
      mqttPublishReport( c );
    }
    else if( receivedChar == 'a' )
    {
      //access point
    }
  }
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

void wifiSetup()
{
  WiFi.hostname(deviceName);      // DHCP Hostname (useful for finding device for static lease)
  WiFi.config(staticIP, subnet, gateway, dns);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to ");
  Serial.print(ssid); Serial.println(" ...");

  int i = 0;
  while (WiFi.status() != WL_CONNECTED) { // Wait for the Wi-Fi to connect
    delay(1000);
    Serial.print(++i); Serial.print(' ');
  }

  Serial.println('\n');
  Serial.println("Connection established!");
  Serial.print("IP address:\t");
  Serial.println(WiFi.localIP());
}

void setup()
{
  Serial.begin( 115200 );
  wifi_set_sleep_type( NONE_SLEEP_T );

  Relay::setup();
  Serial.println( "relay setup finished" );

  wifiSetup();

  mqttSetup();
  Serial.println( "mqttSetup finished" );
}

double lastAmps = 0;
bool firstRun = true;

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
    // if( ( relayState == HIGH && currentAmps > offMaxAmpsThreshold) || //transition from OFF to ON
    //     ( relayState == LOW && currentAmps < onMinAmpsThreshold )   //transition from ON to OFF
    //   )
    if( ( Relay::state == HIGH && currentAmps > offMaxAmpsThreshold) || //transition from OFF to ON
        ( Relay::state == LOW && currentAmps < onMinAmpsThreshold )   //transition from ON to OFF
      )
    {

      // current will jump high once when pressing the pushbutton and also when switching on the light (/relay)
      // switch only if current jumps high ### millisecs AFTER the last jump, in order to ignore spikes due to light switching on
      uint32_t trigger_t = millis();
      if( trigger_t > last_trigger + 500 )
      {
        CheckAmps c = setRelay( Relay::state == HIGH ? true : false );// Relay::toggle(); //toggleRelay();
        trigger = TRIGGER_MANUAL;
        last_trigger = trigger_t;

        mqttPublishReport( c );
        Serial.print( "   Trigger!" );
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

  mqttReconnect();

  client.loop();
}
