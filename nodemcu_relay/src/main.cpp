/*
 * Ahat:
 * IMPORTANT NOTES
 * The PubSubClient library has a continuous disconnect - reconnect bug. In order to correct this add
 * "delay(10);" immediately after "if (connected()) {" in function "boolean PubSubClient::loop()"
 * In order to accommodate larger mqtt messages such as the ones including check errors, increase
 * MQTT_MAX_PACKET_SIZE to 1024 in PubSubClient.h
 * 
 */


#include <ESP8266WiFi.h>
#include <PubSubClient.h>

//needed for library
#include <ESP8266WebServer.h>
#include <DNSServer.h>

#include <ArduinoOTA.h>

#include "Settings.h"
#include "Relay.h"
#include "MQTT.h"
#if USE_WIFIMANAGER == 1
#include "WifiManagerWrapper.h"
#endif
#include <FS.h>
#ifdef WITH_TEMP_SENSOR
#include "DHT.h"
#define DHTTYPE DHT22
#endif

unsigned long start = millis();

// The following line is required to allow ESP to measure Vcc
// see https://arduino-esp8266.readthedocs.io/en/stable/libraries.html#esp-specific-apis
ADC_MODE( ADC_VCC );  

// if the device is not active, it will ignore incoming mqtt messages to toggle the relay
bool active = true;  

bool OTA = false; // when OTA is true the device will stay on to receive OTA updates

bool onMainsPower = true; // should be updated whenever mains power goes and comes back on

// connectionTime stores the elapsed time between start of wifi.connect() and the moment when either 
// WiFi.status() == WL_CONNECTED or timeout
unsigned long connectionTime = 0; 

void wifi_portal_idle();
void mqtt_callback( char* topic, byte* payload, unsigned int length );
void mqtt_connected_callback( bool connected )
{
  digitalWrite( MQTT_LED_PIN, connected ? HIGH : LOW );
  Serial.println( "MQTT" + String( connected ? " " : " NOT " ) + "connected." );
}

Configuration configuration;
WiFiClient espClient;
MQTT mqtt( configuration, espClient, mqtt_connected_callback );
Relay relay( RELAY_PIN, INIT_RELAY_STATE );
#ifdef DOUBLE_RELAY
Relay relay2( RELAY2_PIN, INIT_RELAY_STATE );
#endif

#ifdef WITH_TEMP_SENSOR
DHT dht( TEMP_PIN, DHTTYPE );
float temperature = 0;
float humidity = 0;
#endif

#if USE_WIFIMANAGER == 1
void wifi_portal_idle()
{
  // This runs with almost no delay, do not print to Serial or it will "clog" the output terminal
  // Serial.println( "Doing other staff while wifi portal is idle" );
  // digitalWrite( AP_LED_PIN, HIGH );
  mqtt.loop();
  ArduinoOTA.handle();
}
WifiManagerWrapper wifiManagerWrapper( configuration, mqtt, wifi_portal_idle );
#endif


#if USE_WIFIMANAGER == 0
unsigned long wifiSetup()
{
  // WiFi.persistent( true );
  WiFi.mode( WIFI_OFF );
  WiFi.setAutoConnect( false );
  WiFi.setAutoReconnect( false );
  WiFi.hostname(deviceName);      // DHCP Hostname (useful for finding device for static lease)
  WiFi.config(staticIP, subnet, gateway);//, dns1, dns2);
  WiFi.mode(WIFI_STA);

  Serial.print(F("Connecting to "));
  Serial.print(ssid); Serial.println(F(" ..."));

  // WiFi.begin(ssid, password);
  WiFi.begin( ssid, password, wifiChannel, bssid );
  Serial.println( F("DHCP status: " ) ); Serial.println( String( wifi_station_dhcpc_status() == dhcp_status::DHCP_STOPPED ? "STOPPED" : "STARTED" ) );


  unsigned long startTime = millis();
  // int i = 0;
  while (WiFi.status() != WL_CONNECTED) { // Wait for the Wi-Fi to connect
    // yield();
    delay(10); // without delay or yield ESP8266 crashes and resets while waiting to connect
    // Serial.print(++i); Serial.print(' ');
  }
  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - startTime;
  Serial.println('\n');
  Serial.println( F("Connection established after " ) ); Serial.println( String( elapsedTime ) + " milliseconds" );
  Serial.print( F( "IP address:\t") ); Serial.println( WiFi.localIP());
  Serial.print( F( "Gateway:\t" ) ); Serial.println( WiFi.gatewayIP());
  Serial.print( F( "SSID: " ) ); Serial.println( WiFi.SSID() );
  Serial.print( F( "BSSID: " ) ); Serial.println( WiFi.BSSIDstr() );
  Serial.print( F( "wifi channel: " ) ); Serial.println( String( WiFi.channel() ) );
  Serial.print( F( "wifi RSSI: " ) ); Serial.println( String( WiFi.RSSI() ) );
  Serial.print( F( "DHCP status: " ) ); Serial.println( String( wifi_station_dhcpc_status() == dhcp_status::DHCP_STOPPED ? "STOPPED" : "STARTED" ) );

  return elapsedTime;
}
#endif

// This function will return true if the mains power is on, false if the device 
// operates on battery. In order to detect if power is on, the output of the
// 3.3v power source is read by input pin POWER_READER.
bool mainPowerIsOn()
{
  // return false;
  return digitalRead( POWER_READER_PIN ) == HIGH;
}

void publishConfiguration()
{
  String msg(
    String( "{ " ) +
    "\"cmd\": \"ITEM_UPDATE\"" +
    ", \"info\": { " +
    "\"type\": \"" + DEVICE_TYPE + "\"" +
    ", \"domain\": \"" + DEVICE_DOMAIN + "\"" +
    ", \"firmware\": \"" + FIRMWARE + "\"" +
    ", \"version\": \"" + VERSION + "\"" +
    ", \"protocol\": \"mqtt\"" +
    ", \"name\": \"" + configuration.mqtt.device_name + "\"" +
    ", \"id\": \"" + configuration.mqtt.client_id + "\"" +
    ", \"location\": \"" + configuration.mqtt.location + "\"" +
    ", \"publish\": \"" + configuration.mqtt.publish_topic + "\"" +
    ", \"subscribe\": \"" + configuration.mqtt.subscribe_topic + "\"" +
    ", \"subscribe_cmd_topic\": \"" + configuration.mqtt.subscribe_cmd_topic + "\"" +
    ", \"ip\": \"" + WiFi.localIP().toString() + "\"" +
    ", \"SSID\": \"" + WiFi.SSID() + "\"" +
    ", \"BSSID\": \"" + WiFi.BSSIDstr() + "\"" +
    ", \"wifi channel\": \"" + WiFi.channel() + "\"" +
    ", \"wifi RSSI\": \"" + WiFi.RSSI() + "\"" +
    ", \"VCC\": \"" + ESP.getVcc() + "\"" +
    ", \"active\": \"" + String( active ) + "\"" +
    ", \"wake up\": \"" + ESP.getResetReason() + "\"" +
    ", \"connection time\": \"" + connectionTime + "\"" +
    ", \"mainPowerIsOn\": \"" + String( mainPowerIsOn() ) + "\"" +
    ", \"sleep seconds config/final\": \"" + configuration.switchDevice.sleep_seconds + "/" + configuration.getFinalSleepSeconds(configuration.switchDevice.sleep_seconds.toInt() ) + "\"" +
    ", \"sensor read seconds on mains config/final\": \"" + configuration.switchDevice.sensor_onmains_read_seconds + "/" + configuration.getFinalSleepSeconds( configuration.switchDevice.sensor_onmains_read_seconds.toInt() ) + "\"" +
    ", \"sensor read seconds on battery config/final\": \"" + configuration.switchDevice.sensor_onbattery_read_seconds + "/" + configuration.getFinalSleepSeconds( configuration.switchDevice.sensor_onbattery_read_seconds.toInt() ) + "\"" +
    "}, \"data\": { " +
#ifdef WITH_TEMP_SENSOR
  "\"temperature_celsius\": " + temperature +
  ", \"humidity\": " + humidity + ", " +
#endif  
    "\"relay is on\": \"" + String( relay.isOn() ) + "\"" +
#ifdef DOUBLE_RELAY
      ", \"relay2 is on\": \"" + String( relay2.isOn() ) + "\"" +
#endif
    
  " } }" );
  mqtt.publish( configuration.mqtt.configurator_publish_topic, msg, false );
}

void publishReport()
{ 
  String msg(
    String( "{ " ) +
    "\"msg\": \"EVENT\"" +
    ", \"info\": { " +
    "\"type\": \"" + DEVICE_TYPE + "\"" +
    ", \"domain\": \"" + DEVICE_DOMAIN + "\"" +
    ", \"firmware\": \"" + FIRMWARE + "\"" +
    ", \"version\": \"" + VERSION + "\"" +
    ", \"protocol\": \"mqtt\"" +
    ", \"name\": \"" + configuration.mqtt.device_name + "\"" +
    ", \"id\": \"" + configuration.mqtt.client_id + "\"" +
    ", \"location\": \"" + configuration.mqtt.location + "\"" +
    ", \"publish\": \"" + configuration.mqtt.publish_topic + "\"" +
    ", \"subscribe\": \"" + configuration.mqtt.subscribe_topic + "\"" +
    ", \"subscribe_cmd_topic\": \"" + configuration.mqtt.subscribe_cmd_topic + "\"" +
    ", \"ip\": \"" + WiFi.localIP().toString() + "\"" +
    ", \"wifi RSSI\": \"" + WiFi.RSSI() + "\"" +
    ", \"VCC\": \"" + ESP.getVcc() + "\"" +    
    ", \"wake up\": \"" + ESP.getResetReason() + "\"" +
    ", \"connection time\": \"" + connectionTime + "\"" +
    ", \"mainPowerIsOn\": \"" + String( mainPowerIsOn() ) + "\"" +
    ", \"sleep seconds config/final\": \"" + configuration.switchDevice.sleep_seconds + "/" + configuration.getFinalSleepSeconds( configuration.switchDevice.sleep_seconds.toInt() ) + "\"" +
    ", \"sensor read seconds on mains config/final\": \"" + configuration.switchDevice.sensor_onmains_read_seconds + "/" + configuration.getFinalSleepSeconds( configuration.switchDevice.sensor_onmains_read_seconds.toInt() ) + "\"" +
    ", \"sensor read seconds on battery config/final\": \"" + configuration.switchDevice.sensor_onbattery_read_seconds + "/" + configuration.getFinalSleepSeconds( configuration.switchDevice.sensor_onbattery_read_seconds.toInt() ) + "\"" +
    "}, \"data\": { " +
#ifdef WITH_TEMP_SENSOR
  "\"temperature_celsius\": " + temperature +
  ", \"humidity\": " + humidity + ", " +
#endif  
    "\"relay is on\": \"" + String( relay.isOn() ) + "\"" +
#ifdef DOUBLE_RELAY
      ", \"relay2 is on\": \"" + String( relay2.isOn() ) + "\"" +
#endif
" } }" );
  mqtt.publish( configuration.mqtt.publish_topic, msg, false );
}

bool OTASetupComplete = false;
void OTASetup()
{
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

  OTASetupComplete = true;

  Serial.println( "ArduinoOTA setup finished" );
}

// for an explanation see https://thingpulse.com/max-deep-sleep-for-esp8266/
// TL;DR max sleep interval is around 3:35h – 3:50h. So if configured sleep time
// is > 3:30 i.e. 12600 secs wake up and sleep again
void deepSleep()
{
#ifdef WITH_TEMP_SENSOR
  long sleepSeconds = configuration.switchDevice.sensor_onbattery_read_seconds.toInt();
#else
  long sleepSeconds = configuration.switchDevice.sleep_seconds.toInt();
#endif

  Serial.println( "Switching wifi off" );
  WiFi.mode( WIFI_OFF );

  Serial.print( F("Configuration sleep_seconds: ") ); Serial.println( sleepSeconds );
  Serial.print( F("Final sleep seconds ") ); Serial.println( String( configuration.getFinalSleepSeconds( sleepSeconds ) ) );
  uint64_t sleepTime = sleepSeconds*1000000;
  ESP.deepSleep( sleepTime );
}

WiFiEventHandler wifiConnectedEventHandler, wifiDisconnectedEventHandler;
void onWifiConnected(const WiFiEventStationModeConnected& event)
{
  digitalWrite( AP_LED_PIN, HIGH );
  Serial.println( "AP connected." );
}

void onWifiDisconnected(const WiFiEventStationModeDisconnected& event)
{
  digitalWrite( AP_LED_PIN, LOW );
  Serial.println( "AP NOT connected." );
}

#ifdef WITH_TEMP_SENSOR
unsigned int getTempReportMillis()
{
  return ( onMainsPower ? 
      configuration.switchDevice.sensor_onmains_read_seconds.toInt() :
      configuration.switchDevice.sensor_onbattery_read_seconds.toInt()
    ) * 1000;
}

unsigned int lastTempReportMillis = 0;
void reportTemperature( bool waitTempMillis = false )
{
  if( waitTempMillis && millis() - lastTempReportMillis < getTempReportMillis() )
  {
    return;
  }

  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  publishReport();

  lastTempReportMillis = millis();
}
#endif

void setup() 
{
  pinMode( POWER_READER_PIN, INPUT );

  pinMode( ON_LED_PIN, OUTPUT );
  digitalWrite( ON_LED_PIN, HIGH );

  pinMode( MQTT_LED_PIN, OUTPUT );
  digitalWrite( MQTT_LED_PIN, LOW );

  pinMode( AP_LED_PIN, OUTPUT );
  digitalWrite( AP_LED_PIN, LOW );

  Serial.begin(115200);
  // Serial.setTimeout(2000);

  Serial.println();

  onMainsPower = mainPowerIsOn();

  configuration.setup();

  active = configuration.switchDevice.active == "true";

#ifdef WITH_TEMP_SENSOR
  pinMode( TEMP_PIN, INPUT );
  dht.begin();
#endif

  relay.setup();
#ifdef DOUBLE_RELAY
  relay2.setup();
#endif

  // NOTE: mqtt setup must run before wifiManagerProxy init because wifiManagerWrapper may get
  // new values and will then run mqtt.setup() again with the new values
  mqtt.setup( mqtt_callback );
  Serial.println( F( "mqttSetup finished" ) );

  int vdd = ESP.getVcc();
  Serial.print( F("VDD: ") ); Serial.println( String( vdd ) );

  // NOTE: if the results of onStationModeDisconnected and onStationModeConnected are not
  // save in WifiEventHandler, the corresponding callbacks are never called!!!
  wifiDisconnectedEventHandler = WiFi.onStationModeDisconnected( &onWifiDisconnected );
  wifiConnectedEventHandler = WiFi.onStationModeConnected( &onWifiConnected );

  #if USE_WIFIMANAGER == 1
    wifiManagerWrapper.initFromConfiguration();
    
    if( !wifiManagerWrapper.connect() )
    {
      Serial.println( "WiFi connect with saved values failed. Starting Access Point..." );
      wifiManagerWrapper.startAPWithoutConnecting();
    }
    connectionTime = wifiManagerWrapper.getConnectionTime();
  #else
    connectionTime = wifiSetup();
  #endif

#ifdef WITH_TEMP_SENSOR
  // If this device also has a temp sensor and mainsPower is off report temperature and battery status
  if( !onMainsPower )
  {
    if( mqtt.connect() )
    {
      // IMPORTANT: if this device subscribes to a topic at the time of connection and if mqtt.loop() 
      // is ommited the publish() mqtt message is reported as successfully published 
      // but it never arrives at the mqtt broker (as observed in the logs of the broker). 
      // In such a case a delay( ??? ) is required before mqtt.publish
      delay( 50 );
      reportTemperature();

      // IMPORTANT: without a delay before mqtt.loop() the mqtt message is reported as successfully
      // published but it never arrives at the mqtt broker (as observed in the logs of the broker)
      delay( 50 );
      mqtt.loop();  // receive any pending incoming messages
      delay( 200 );
    }
    else
    {
      Serial.println( F("MQTT connection failed. Changing to WIFI AP Setup mode") );
      // We want wifimanager to collect fresh parameters.
      wifiManagerWrapper.startAPWithoutConnecting();
    }
  }
#endif

  unsigned long finish = millis();
  unsigned long total = finish - start;
  Serial.print( F("Complete setup finished in ") ); Serial.print( String( total ) ); Serial.println( F(" milliseconds") );

  if( !OTA && !onMainsPower )
  {
    Serial.println( "!OTA && !onMainsPower" );
    
    Serial.println( "Going to deep sleep at end of Setup()" );
    deepSleep();
  }

}


void handleOTA()
{
  if( !OTASetupComplete )
  {
    OTASetup();
  }
  ArduinoOTA.handle();
}

void onMainsPowerLoop()
{  
  bool previousOnMainsPower = onMainsPower; //debug

  onMainsPower = mainPowerIsOn();

  if( previousOnMainsPower != onMainsPower )
  {
    Serial.println( "From main power " + String( previousOnMainsPower ? "ON" : "OFF") + " to " + String( onMainsPower ? "ON" : "OFF") );
  }
  
  if( !mqtt.connected() )
  {
    Serial.println( " !mqtt.connected" );
    if( mqtt.connect() )
    {
      publishConfiguration();
    }
    else
    {
      Serial.println( " mqtt.connect failed" );
      wifiManagerWrapper.startAPWithoutConnecting();
    }
  }

  reportTemperature( true );

  mqtt.loop();

  handleOTA();

}

void onBatteryLoop()
{
  // Serial.println( "In onBatteryLoop" );

  if( OTA )
  {
    handleOTA();
    delay( 50 );
  }
  else
  {
    deepSleep();
  }
}

void loop() 
{  
  if( onMainsPower )
  {
    onMainsPowerLoop();
  }
  else
  {
    onBatteryLoop();
  }
}


void activate()
{
  if( active )
  {
    return;
  }
  active = true;
  configuration.switchDevice.active = "true";
  configuration.write();
}

void deactivate()
{
  if( !active )
  {
    return;
  }
  active = false;
  configuration.switchDevice.active = "false";
  configuration.write();
}

bool jsonContainsData( String jsonText, String key, String value )
{
  DynamicJsonBuffer jsonBuffer;
  JsonObject& json = jsonBuffer.parseObject( jsonText );
  Serial.println( "Json parsing " + jsonText );
  json.printTo( Serial );
  if( !json.success() )
  { 
    return false;
  }
  if( !json.containsKey( "data" ) )
  {
    return false;
  }

  if( !json["data"].as<JsonObject>().containsKey( key ) )
  {
    return false;
  }

  return json["data"][key] == value;
}

void mqtt_callback( char* _topic, byte* _payload, unsigned int length )
{
  String topic( _topic );
  char __payload[length+1];
  memset( __payload, 0, length+1 );
  memcpy( __payload, _payload, length );
  String payload( __payload );
  Serial.print( F("Message arrived [") );
  Serial.print( _topic );
  Serial.print( F("] {" ) ); Serial.print( payload ); Serial.println( F("}") );

  // if I connect with qos 0 no messages are received
  // if I connect with qos 2 no messages are received
  // if I connect with qos 1, the received message is received every time I reconnect with qos 1
  // so I disconnect and reconnect with cleanSession = true to get read of received message
  // NOTE: after disconnect() params char* _topic and byte* _payload is no longer valid
  // that's why I copy them to local variables
  mqtt.disconnect();
  mqtt.connect( true );

  // Serial.println( "subscribe_topic: [" + mqtt.subscribe_topic + "], _configurator_subscribe_topic: [" + mqtt.configurator_subscribe_topic + "]" );

  if( topic == mqtt.subscribe_cmd_topic )
  {
    if( payload == "r" )
    {
      publishReport();
    }
    else if( payload == "w" )
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
    else if( payload == "a" )
    {
      activate();
      publishReport();
    }
    else if( payload == "d" )
    {
      deactivate();
      publishReport();
    }
    else if( payload == "o" )
    {
      OTA = true;
      Serial.println( F("Changing to OTA mode") );
    }
    else if( payload.startsWith( "sensor_onmains_read_seconds" ) )
    {
      String txtSecs = payload.substring( 28 );
      if( isnan( txtSecs.toInt() ) )
      {
        Serial.println( txtSecs + " is not a number or is less than 0. Sensor read seconds on mains unchanged" );
      }
      else
      {
        configuration.switchDevice.sensor_onmains_read_seconds = txtSecs;
        Serial.println( "Sensor read seconds on mains: " + txtSecs );
        configuration.write();
      }
    }
    else if( payload.startsWith( "sensor_onbattery_read_seconds" ) )
    {
      String txtSecs = payload.substring( 30 );
      if( isnan( txtSecs.toInt() ) )
      {
        Serial.println( txtSecs + " is not a number. Sensor read seconds on battery unchanged" );
      }
      else
      {
        configuration.switchDevice.sensor_onbattery_read_seconds = txtSecs;
        Serial.println( "Sensor read seconds on battery: " + txtSecs );
        configuration.write();
      }
    }
    else if( payload == "on" )
    {
      relay.on();
      publishReport();
    }
    else if( payload == "off" )
    {
      relay.off();
      publishReport();
    }
#ifdef DOUBLE_RELAY
    else if( payload == "on2" )
    {
      relay2.on();
      publishReport();
    }
    else if( payload == "off2" )
    {
      relay2.off();
      publishReport();
    }    
#endif
    
  }
  else if( topic == mqtt.subscribe_topic )
  {
    if( jsonContainsData( payload, "buttonPressed", "1" ) )
    {
      if( active )
      {
        relay.toggle();
        publishReport();
      }
    }

#ifdef DOUBLE_RELAY   
    if( jsonContainsData( payload, "button2Pressed", "1" ) )
    {
      if( active )
      {
        relay2.toggle();
        publishReport();
      }
    }
#endif

  }
  else if( topic == mqtt.configurator_subscribe_topic )
  {
    publishConfiguration();
  }
  else
  {
    Serial.println( " ignoring unknown topic..." );
  }
}
