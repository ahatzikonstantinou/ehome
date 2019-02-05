/*
 * IMPORTANT NOTE
 * Ahat: The PubSubClient library has a continuous disconnect - reconnect bug. In order to correct this addr
 * "delay(10);" immediately after "if (connected()) {" in function "boolean PubSubClient::loop()"
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
//#define RELAY_PIN D0

#include "Relay.h"
// int relayState = HIGH;  // When the light is connected on the Normally Open contact of the relay, a LOW will keep the light initially switched off

#include "MeasureAmps.h"

#include "Calibration.h"

//The following values were good thresholds when using a 60W incadescent light bulb
double offMaxAmp = 0.15;
double onMinAmp = 0.25;


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

uint32_t last_trigger = millis();

void callback( char* topic, byte* payload, unsigned int length)
{
  Serial.print( "Message arrived [" );
  Serial.print( topic );
  Serial.println( "] " );

  // set last_trigger to avoid follow-on triggers as the current may spike again once the relay changes state
  last_trigger = millis();

  for (unsigned int i=0;i<length;i++)
  {
    char receivedChar = (char)payload[i];
    Serial.print(receivedChar);
    if (receivedChar == '0')
    {
      Relay::off();
    }
    if (receivedChar == '1')
    {
      Relay::on();
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

  // Serial.println( "Calibrating..." );
  // Calibration c;
  // c.run();
  // Serial.println( "Calibration: offMaxAmps = " + String( c.offMaxAmps ) + ", onMinAmps = " + String( c.onMinAmps ) );
  // offMaxAmp = c.offMaxAmps * OFF_MAX_AMPS_FACTOR;
  // onMinAmp = c.onMinAmps * ON_MIN_AMPS_FACTOR;
  // Serial.println( "Thresholds: offMaxAmp = " + String( offMaxAmp ) + ", onMinAmp = " + String( onMinAmp ) );
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
    // if( ( relayState == HIGH && currentAmps > offMaxAmp) || //transition from OFF to ON
    //     ( relayState == LOW && currentAmps < onMinAmp )   //transition from ON to OFF
    //   )
    if( ( Relay::state == HIGH && currentAmps > offMaxAmp) || //transition from OFF to ON
        ( Relay::state == LOW && currentAmps < onMinAmp )   //transition from ON to OFF
      )
    {

      // current will jump high once when pressing the pushbutton and also when switching on the light (/relay)
      // switch only if current jumps high ### millisecs AFTER the last jump, in order to ignore spikes due to light switching on
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

  mqttReconnect();

  // delay( 100 );
}
