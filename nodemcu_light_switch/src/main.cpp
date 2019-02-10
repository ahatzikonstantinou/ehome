/*
 * Ahat:
 * IMPORTANT NOTES
 * The PubSubClient library has a continuous disconnect - reconnect bug. In order to correct this addr
 * "delay(10);" immediately after "if (connected()) {" in function "boolean PubSubClient::loop()"
 * In order to accommodate larger mqtt messages such as the ones including check errors, increase
 * MQTT_MAX_PACKET_SIZE to 1024 in PubSubClient.h
 */


#include <ESP8266WiFi.h>
#include <PubSubClient.h>

//needed for library
#include <ESP8266WebServer.h>
#include <DNSServer.h>

#include <ArduinoOTA.h>

#include "Settings.h"
#include "Relay.h"
#include "MeasureAmps.h"
#include "Calibration.h"
#include "CheckAmps.h"
#include "MQTT.h"
#if USE_WIFIMANAGER == 1
#include "WifiManagerWrapper.h"
#endif
#include <FS.h>
#include "Buzzer.h"

#define PIN_FLASH 0
int previousFlashState = 1; //ahat: this is important. 0: PRESSED, 1: RELEASED. previousFlashState must start with 1
                            //or else as soon as the first input is read it will look like FLASH was pressed

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

// unsigned int operation_mode = OPERATION_MANUAL_ONLY;
unsigned int operation_mode = OPERATION_MANUAL_WIFI;

String operationModeToStr()
{
  String text = "";
  if( operation_mode == OPERATION_MANUAL_ONLY )
  {
    text = "MANUAL_ONLY";
  }
  else if( operation_mode == OPERATION_MANUAL_WIFI )
  {
    text = "MANUAL_WIFI";
  }

  return text;
}

unsigned int toggleOperationMode()
{
  if( operation_mode == OPERATION_MANUAL_ONLY )
  {
    Serial.println( "Toglling operation to MANUAL_WIFI" );
    operation_mode = OPERATION_MANUAL_WIFI;
  }
  else
  {
    Serial.println( "Toglling operation to MANUAL_ONLY" );
    operation_mode = OPERATION_MANUAL_ONLY;
  }
  return operation_mode;
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
const char* publish_topic = "A/4/L/LIGHT/L1/state";
const char* subscribe_topic = "A/4/L/LIGHT/L1/set";
const char* configurator_publish_topic = "A///CONFIGURATION/C/cmd";
const char* configurator_subscribe_topic = "A///CONFIGURATION/C/report";
const char* location = "A/4/L";

WiFiClient espClient;
MQTT mqtt( espClient );
#if USE_WIFIMANAGER == 1
WifiManagerWrapper wifiManagerWrapper( mqtt );
#endif

Relay relay( RELAY_PIN, INIT_RELAY_STATE );

void flashSetup()
{
  pinMode( PIN_FLASH, INPUT_PULLUP );
  //ahat: this is important. 0: PRESSED, 1: RELEASED. previousFlashState must start with 1
  //or else as soon as the first input is read it will look like FLASH was pressed
  previousFlashState = 1; // Starting with Flash RELEASED
  Serial.print( "Starting with previousFlashState:" );
  Serial.println( previousFlashState );
}

// use the flash button on the nodemcu module to reset parameters and start wifi manager in AP mode
// so that the user may enter new parameter values
void loopReadFlash()
{
  int inputState = digitalRead( PIN_FLASH );
  if( inputState != previousFlashState )
  {
    // Serial.printf( "In loopReadFlash: previousFlashState = %d, inputState = %d\n", previousFlashState, inputState );
    Serial.print("Flash is " );
    if( inputState )
    {
      Serial.println( "RELEASED" );

      if( operation_mode == OPERATION_MANUAL_WIFI )
      {
        #if USE_WIFIMANAGER == 1
          // We want wifimanager to collect fresh parameters.
          wifiManagerWrapper.startAPWithoutConnecting();

          //if you get here you have connected to the WiFi
          Serial.println("connected...yeey :)");
        #else
          Serial.println( "The command to switch to WIFI AP Setup mode works only with 'USE_WIFIMANAGER 1'" );
        #endif
      }
    }
    else
    {
      Serial.println( "PRESSED" );
    }
    previousFlashState = inputState;
  }
}

CheckAmps setRelay( bool on )
{
  if( on )
  {
    relay.on();
  }
  else
  {
    relay.off();
  }
  CheckAmps c;
  c.check( relay, offMaxAmpsThreshold, onMinAmpsThreshold );

  //If the light bulb is burnt or missing switch the Relay back to off, because any
  //consecutive low current amp measurement will be considered a trigger if the relay.state is LOW
  if( c.onError )
  {
    Serial.println( "There was an error switching the Relay on!" );
    relay.off();
  }
  return c;
}

uint32_t last_trigger = millis();

void mqtt_callback( char* topic, byte* payload, unsigned int length)
{
  Serial.print( "Message arrived [" );
  Serial.print( topic );
  Serial.print( "] " );

  String _topic( topic );
  String _subscribe_topic( subscribe_topic );
  String _configurator_subscribe_topic( configurator_subscribe_topic );

  if( _topic == _subscribe_topic )
  {
    for (unsigned int i=0;i<length;i++)
    {
      char receivedChar = (char)payload[i];
      Serial.println(receivedChar);
      if( receivedChar == '0' )
      {
        // set last_trigger to avoid follow-on triggers as the current may spike again once the relay changes state
        last_trigger = millis();
        CheckAmps c = setRelay( false );
        trigger = TRIGGER_WIFI;
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), offMaxAmpsThreshold, onMinAmpsThreshold, c );
      }
      else if( receivedChar == '1' )
      {
        // set last_trigger to avoid follow-on triggers as the current may spike again once the relay changes state
        last_trigger = millis();
        CheckAmps c = setRelay( true );
        trigger = TRIGGER_WIFI;
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), offMaxAmpsThreshold, onMinAmpsThreshold, c );
      }
      else if( receivedChar == 'l' )
      {
        //calibrate
        trigger = TRIGGER_CALIBRATION;
        Serial.println( "Before calibration: offMaxAmpsThreshold = " + String( offMaxAmpsThreshold ) + ", onMinAmpsThreshold = " + String( onMinAmpsThreshold ) );
        Serial.println( "Calibrating..." );
        Calibration c;
        c.run( relay, offMaxAmpsThreshold, onMinAmpsThreshold );
        // set last_trigger again to avoid follow-on triggers because calibration lasts longer than the min allowed time between triggers
        last_trigger = millis();

        Serial.println( "After calibration: offMaxAmpsThreshold = " + String( offMaxAmpsThreshold ) + ", onMinAmpsThreshold = " + String( onMinAmpsThreshold ) );
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), offMaxAmpsThreshold, onMinAmpsThreshold );
      }
      else if( receivedChar == 'r' )
      {
        //report
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), offMaxAmpsThreshold, onMinAmpsThreshold );
      }
      else if( receivedChar == 'c' )
      {
        //check
        trigger = TRIGGER_CHECK;
        Serial.println( "Checking..." );
        CheckAmps c;
        c.run( relay, offMaxAmpsThreshold, onMinAmpsThreshold );
        // set last_trigger again to avoid follow-on triggers because calibration lasts longer than the min allowed time between triggers
        last_trigger = millis();
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), offMaxAmpsThreshold, onMinAmpsThreshold, c );
      }
      else if( receivedChar == 'w' )
      {
        //access point
        #if USE_WIFIMANAGER == 1
          Serial.println( "Changing to WIFI AP Setup mode" );
          // We want wifimanager to collect fresh parameters.
          wifiManagerWrapper.startAPWithoutConnecting();
        #else
          Serial.println( "The command to switch to WIFI AP Setup mode works only with 'USE_WIFIMANAGER 1'" );
        #endif
      }
      else if( receivedChar == 'a' )
      {
        relay.activate();
      }
      else if( receivedChar == 'd' )
      {
        //deactivate
        relay.deactivate();
      }
    }
  }
  else if( _topic == _configurator_subscribe_topic )
  {
    mqtt.publishConfiguration();
  }
}

#if USE_WIFIMANAGER == 0
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
#endif

void setup()
{
  Buzzer::setup();
  Buzzer::playStart();

  Serial.begin( 115200 );
  wifi_set_sleep_type( NONE_SLEEP_T );

  relay.setup();
  Serial.println( "relay setup finished" );

  flashSetup();
  Serial.println( "flashSetup finished" );

  // Setup some initial values to mqtt params before wifimanager attempts to read from storage or get from AP
  // IMPORTANT NOTE: access of member variables is allowed only inside function blocks!
  // The following lines will produce "error: 'mqtt' does not name a type" if placed outside function setup()
  mqtt.device_name = "Φως επίδειξης";
  mqtt.client_id = "light1";
  mqtt.location = location;
  mqtt.server = mqtt_server;
  mqtt.port = mqtt_port;
  mqtt.publish_topic = publish_topic;
  mqtt.subscribe_topic = subscribe_topic;
  mqtt.configurator_publish_topic = configurator_publish_topic;
  mqtt.configurator_subscribe_topic = configurator_subscribe_topic;

  mqtt.setup( mqtt_callback ); //mqttSetup();
  Serial.println( "mqttSetup finished" );

  if( operation_mode == OPERATION_MANUAL_WIFI )
  {
    #if USE_WIFIMANAGER == 1
      // wifiManagerWrapper.setup( true );
      wifiManagerWrapper.initFromJsonConfig();
      if( !wifiManagerWrapper.reconnectsExceeded() )
      {
        Serial.println( "wifiManagerWrapper reconnects NOT exceeded, attempting autoconnectWithOldValues..." );
        wifiManagerWrapper.autoconnectWithOldValues();
      }
      else
      {
        Serial.println( "wifiManagerWrapper.reconnectsExceeded, attempting startAPWithoutConnecting..." );
        wifiManagerWrapper.resetReconnects();
        wifiManagerWrapper.startAPWithoutConnecting();
      }

    #else
      wifiSetup();
    #endif

    // OTA setup
    ArduinoOTA.onStart([]() {
      Serial.println("Start OTA");
    });

    ArduinoOTA.onEnd([]() {
      Serial.println("End OTA");
    });

    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
      Serial.printf("Progress: %u%%\n", (progress / (total / 100)));
    });

    ArduinoOTA.onError([](ota_error_t error) {
      Serial.printf("Error[%u]: ", error);
      if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
      else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
      else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
      else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
      else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });

    ArduinoOTA.begin();

    Serial.println( "ARduinoOTA setup finished" );
  }

  Buzzer::playSetupFinished();
}

double lastAmps = 0;
bool firstRun = true;

void loop()
{
  // check Amp and toggle relay accordingly
  double currentAmps = getAmpsRMS();
  if( !firstRun )
  {
    if( ( relay.state == HIGH && currentAmps > offMaxAmpsThreshold) || //transition from OFF to ON
        ( relay.state == LOW && currentAmps < onMinAmpsThreshold )   //transition from ON to OFF
      )
    {
      // current will jump high once when pressing the pushbutton and also when switching on the light (/relay)
      // switch only if current jumps high ### millisecs AFTER the last jump, in order to ignore spikes due to light switching on
      uint32_t trigger_t = millis();
      if( trigger_t > last_trigger + MIN_TRIGGER_MILLIS )
      {
        if( trigger_t < last_trigger + MAX_TWO_TRIGGER_MILLIS )
        {
          toggleOperationMode();
          Serial.println( "Double valid trigger, switched operation mode to " + operationModeToStr() );
        }
        else
        {
          CheckAmps c = setRelay( relay.state == HIGH ? true : false );// relay.toggle(); //toggleRelay();
          trigger = TRIGGER_MANUAL;
          last_trigger = trigger_t;
          if( operation_mode == OPERATION_MANUAL_WIFI )
          {
            mqtt.publishReport( relay.state, relay.active, triggerToStr(), offMaxAmpsThreshold, onMinAmpsThreshold, c );
          }
        }
        Serial.print( "   Trigger: " );
      }
      else
      {
        Serial.print( "   Ignored trigger: " );
      }

      Serial.print( ", lastAmps = " + String( lastAmps ) );
      Serial.println( ", currentAmps = " + String( currentAmps ) );
    }
  }
  lastAmps = currentAmps;

  if( operation_mode == OPERATION_MANUAL_WIFI )
  {
    mqtt.reconnect();
    if( firstRun )
    {
        mqtt.publishConfiguration();  // tell the world we started
    }

    if( mqtt.reconnectsExceeded() )
    {
      #if USE_WIFIMANAGER == 1
        Serial.println( "MQQT reconnects exceeded, will start AP without connecting to get new credentials from user..." );
        wifiManagerWrapper.startAPWithoutConnecting();
      #endif
    }
    mqtt.loop();

    ArduinoOTA.handle();
  }

  loopReadFlash();


  if( firstRun )
  {
    Serial.println( "firstRun = true" );
    firstRun = false;
  }
}
