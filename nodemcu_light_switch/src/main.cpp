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
#include "ManualSwitch.h"
#include "Definitions.h"


int previousFlashState = 1; //ahat: this is important. 0: PRESSED, 1: RELEASED. previousFlashState must start with 1
                            //or else as soon as the first input is read it will look like FLASH was pressed

char trigger; // holds a value indicating whether the last trigger was manual or wifi

// unsigned int operation_mode = OPERATION_MANUAL_ONLY;
// unsigned int operation_mode = OPERATION_MANUAL_WIFI;

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

String triggerToStr();
void toggleOperationMode();
String operationModeToStr();
void loopReadFlash();
void flashSetup();
void double_trigger_callback( Relay* relay );
void single_trigger_callback( Relay* relay );
CheckAmps setRelay( bool on );
void wifi_portal_idle();
void mqtt_callback( char* topic, byte* payload, unsigned int length );

Configuration configuration;
WiFiClient espClient;
MQTT mqtt( configuration, espClient );
//Threshold values 0.15, 0.25 were good thresholds when using a 60W incadescent light bulb
Relay relay( RELAY_PIN, INIT_RELAY_STATE, 0.15, 0.25 );
ManualSwitch manualSwitch( relay, mqtt, single_trigger_callback, double_trigger_callback );
#if USE_WIFIMANAGER == 1
void wifi_portal_idle()
{
  // This runs with almost no delay, do not print to Serial or it will "clog" the output terminal
  // Serial.println( "Doing other staff while wifi portal is idle" );
  manualSwitch.loop( false );
  mqtt.loop();
  ArduinoOTA.handle();
  loopReadFlash();
}
WifiManagerWrapper wifiManagerWrapper( configuration, mqtt, wifi_portal_idle );
#endif


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

  configuration.setup();
  configuration.operation_mode = OPERATION_MANUAL_WIFI; //hardcode this because OPERATION_MANUAL_ONLY does not seem to work properly

  relay.setup( configuration );
  Serial.println( "relay setup finished" );

  manualSwitch.setup();
  Serial.println( "manualSwitch setup finished" );

  flashSetup();
  Serial.println( "flashSetup finished" );

  if( configuration.operation_mode == OPERATION_MANUAL_WIFI )
  {
    Serial.println( "operation_mode: OPERATION_MANUAL_WIFI" );

    // // Setup some initial values to mqtt params before wifimanager attempts to read from storage or get from AP
    // // IMPORTANT NOTE: access of member variables is allowed only inside function blocks!
    // // The following lines will produce "error: 'mqtt' does not name a type" if placed outside function setup()
    // mqtt.device_name = "Φως επίδειξης";
    // mqtt.client_id = "light1";
    // mqtt.location = location;
    // mqtt.server = mqtt_server;
    // mqtt.port = mqtt_port;
    // mqtt.publish_topic = publish_topic;
    // mqtt.subscribe_topic = subscribe_topic;
    // mqtt.configurator_publish_topic = configurator_publish_topic;
    // mqtt.configurator_subscribe_topic = configurator_subscribe_topic;

    // NOTE: mqtt setup must run before wifiManagerProxy because wifiManagerWrapper may get new values and will then
    // run mqtt.setup() again with the new values
    mqtt.setup( mqtt_callback );
    Serial.println( "mqttSetup finished" );

    #if USE_WIFIMANAGER == 1
      // wifiManagerWrapper.setup( true );
      wifiManagerWrapper.initFromConfiguration();
      if( !wifiManagerWrapper.reconnectsExceeded() )
      {
        Serial.println( "wifiManagerWrapper reconnects NOT exceeded, attempting autoconnectWithOldValues..." );
        configuration.wifi.SSID = "ST-VIRUS";
        configuration.wifi.password = "ap2109769675ap";
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
  }
  else
  {
    Serial.println( "operation_mode: OPERATION_MANUAL_ONLY" );
    wifiManagerWrapper.startAPWithoutConnecting( false );
  }

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

  Serial.println( "ArduinoOTA setup finished" );

  Buzzer::playSetupFinished();
}

bool firstRun = true;

void loop()
{
  manualSwitch.loop( firstRun );

  if( configuration.operation_mode == OPERATION_MANUAL_WIFI )
  {
    mqtt.reconnect();
    if( firstRun )
    {
        mqtt.publishConfiguration();  // tell the world we started
    }

    if( mqtt.reconnectsExceeded() )
    {
      #if USE_WIFIMANAGER == 1
        Serial.println( "MQTT reconnects exceeded, will start AP without connecting to get new credentials from user..." );
        wifiManagerWrapper.startAPWithoutConnecting();
      #endif
    }
    mqtt.loop();
  }

  ArduinoOTA.handle();

  loopReadFlash();

  if( firstRun )
  {
    Serial.println( "firstRun = true" );
    firstRun = false;
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
  c.check( relay );

  //If the light bulb is burnt or missing switch the Relay back to off, because any
  //consecutive low current amp measurement will be considered a trigger if the relay.state is LOW
  if( c.onError )
  {
    Serial.println( "There was an error switching the Relay on!" );
    relay.off();
  }
  return c;
}

void single_trigger_callback( Relay* relay )
{
  CheckAmps c = setRelay( relay->state == HIGH ? true : false );// relay->toggle(); //toggleRelay();
  trigger = TRIGGER_MANUAL;
  if( configuration.operation_mode == OPERATION_MANUAL_WIFI )
  {
    mqtt.publishReport( relay->state, relay->active, triggerToStr(), relay->offMaxAmpsThreshold, relay->onMinAmpsThreshold, c );
  }
}

void double_trigger_callback( Relay* relay )
{
  toggleOperationMode();
}

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

      if( configuration.operation_mode == OPERATION_MANUAL_WIFI )
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

String operationModeToStr()
{
  String text = "";
  if( configuration.operation_mode == OPERATION_MANUAL_ONLY )
  {
    text = "MANUAL_ONLY";
  }
  else if( configuration.operation_mode == OPERATION_MANUAL_WIFI )
  {
    text = "MANUAL_WIFI";
  }

  return text;
}

void toggleOperationMode()
{
  // if( configuration.operation_mode == OPERATION_MANUAL_ONLY )
  // {
  //   Serial.println( "Toglling operation to MANUAL_WIFI" );
  //   configuration.operation_mode = OPERATION_MANUAL_WIFI;
  // }
  // else
  // {
  //   Serial.println( "Toglling operation to MANUAL_ONLY" );
  //   configuration.operation_mode = OPERATION_MANUAL_ONLY;
  // }
  // configuration.write();

  // Buzzer::playRestart();
  // ESP.restart();
}

void mqtt_callback( char* topic, byte* payload, unsigned int length )
{
  Serial.print( "Message arrived [" );
  Serial.print( topic );
  Serial.print( "] " );

  String _topic( topic );
  // String _subscribe_topic( mqtt.subscribe_topic );
  // String _configurator_subscribe_topic( configurator_subscribe_topic );

  Serial.println( "subscribe_topic: [" + mqtt.subscribe_topic + "], _configurator_subscribe_topic: [" + mqtt.configurator_subscribe_topic + "]" );

  if( _topic == mqtt.subscribe_topic )
  {
    for (unsigned int i=0;i<length;i++)
    {
      char receivedChar = (char)payload[i];
      Serial.println(receivedChar);
      if( receivedChar == '0' )
      {
        // set last_trigger to avoid follow-on triggers as the current may spike again once the relay changes state
        manualSwitch.last_trigger = millis();
        CheckAmps c = setRelay( false );
        trigger = TRIGGER_WIFI;
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), relay.offMaxAmpsThreshold, relay.onMinAmpsThreshold, c );
      }
      else if( receivedChar == '1' )
      {
        // set last_trigger to avoid follow-on triggers as the current may spike again once the relay changes state
        manualSwitch.last_trigger = millis();
        CheckAmps c = setRelay( true );
        trigger = TRIGGER_WIFI;
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), relay.offMaxAmpsThreshold, relay.onMinAmpsThreshold, c );
      }
      else if( receivedChar == 'l' )
      {
        //calibrate
        trigger = TRIGGER_CALIBRATION;
        Serial.println( "Before calibration: offMaxAmpsThreshold = " + String( relay.offMaxAmpsThreshold ) + ", onMinAmpsThreshold = " + String( relay.onMinAmpsThreshold ) );
        Serial.println( "Calibrating..." );
        Calibration c;
        c.run( relay );

        configuration.relay.offMaxAmpsThreshold = relay.offMaxAmpsThreshold;
        configuration.relay.onMinAmpsThreshold = relay.onMinAmpsThreshold;
        configuration.write();

        // set last_trigger again to avoid follow-on triggers because calibration lasts longer than the min allowed time between triggers
        manualSwitch.last_trigger = millis();

        Serial.println( "After calibration: offMaxAmpsThreshold = " + String( relay.offMaxAmpsThreshold ) + ", onMinAmpsThreshold = " + String( relay.onMinAmpsThreshold ) );
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), relay.offMaxAmpsThreshold, relay.onMinAmpsThreshold );
      }
      else if( receivedChar == 'r' )
      {
        //report
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), relay.offMaxAmpsThreshold, relay.onMinAmpsThreshold );
      }
      else if( receivedChar == 'c' )
      {
        //check
        trigger = TRIGGER_CHECK;
        Serial.println( "Checking..." );
        CheckAmps c;
        c.run( relay );
        // set last_trigger again to avoid follow-on triggers because checking lasts longer than the min allowed time between triggers
        manualSwitch.last_trigger = millis();
        mqtt.publishReport( relay.state, relay.active, triggerToStr(), relay.offMaxAmpsThreshold, relay.onMinAmpsThreshold, c );
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
  else if( _topic == mqtt.configurator_subscribe_topic )
  {
    mqtt.publishConfiguration();
  }
  else
  {
    Serial.println( " ignoring unknown topic..." );
  }
}
