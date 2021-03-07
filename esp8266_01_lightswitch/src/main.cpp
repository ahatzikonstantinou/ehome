/*
 * Ahat:
 * IMPORTANT NOTES
 * The PubSubClient library has a continuous disconnect - reconnect bug. In order to correct this add
 * "delay(10);" immediately after "if (connected()) {" in function "bool PubSubClient::loop()"
 * In order to accommodate larger mqtt messages such as the ones including check errors, increase
 * MQTT_MAX_PACKET_SIZE to 1024 in PubSubClient.h
 * 
 * USAGE:
 *  NOTE: Use with Settings.h:USE_WIFIMANAGER 1. USE_WIFIMANAGER 0 should be used only in development
 *        as it requires to manuall set initial values for wifi and mqtt connections
 *  Whenever ESP8266 starts (e.g. after a manual or software reset) it will read configuration data
 *  from flash memory and attempt to:
 *  1) connect to a wifi. First attempt is done using static ip, gateway, subnet, bssid ( i.e. mac 
 *      address of access point), wifi channel, ssid, and password. If the connection fails it 
 *      will attempt to slow connect using only ssid and password. If this fails too it will change
 *      to Access Point Configuration Portal mode. Use a smartphone or laptop to find it, connect to 
 *      it over wifi, and set the correct connection parameters.
 *  2) if wifi connection succeeds it will attempt to make an mqtt connection. If the connection fails
 *      it will change to Access Point Configuration Portal mode. Use a smartphone or laptop to find it, 
 *      connect to it over wifi, and set the correct connection parameters.
 *  3) if mqtt connection succeeds and ESP8266 is "active" it will send an mqtt message to the configured
 *      mqtt publish topic.
 *      It will also listen for any pending incoming mqtt messages with the configured subscribe topic.
 *      The following messages are available:
 *        'r': publishReport( active );
 *        'w': change to access point configuration portal mode
 *        'a': activate
 *        'd': deactivate
 *        'o': change to OTA mode. ESP8266 will keep the wifi on without timeout for OTA functionality.
 *             Note that ESP8266-01 with 512 KB of memory cannot use OTA due to its low memory.
 *        
 *        Any incoming message with configurator_subscribe_topic (regardless of its payload) will cause
 *        ESP8266 to send an mqtt configuration message to configurator_publish_topic.
 * 
 *      To send mqtt messages to ESP8266 from another device, e.g. use a linux client mosquitto_pub, send
 *      the mqtt message with QOS 1 and then reset ESP8266. The mqtt broker keeps the message until it is
 *      delivered at least once. When ESP8266 restarts it will listen for pending
 *      incoming messages.
 * 
 *  If you wish to reset its configuration either stop the mqtt broker or the wifi network so that it
 *  will change to Access Point Configuration Portal mode. Use a smartphone or laptop to find it, 
 *  connect to it over wifi, and set the correct connection parameters.
 * 
 *  NOTE: wifi connection to a ZTE home router varies widely between 200ms and 12secs. However, when 
 *        using a raspeberry pi 3B+ as a routed wireless access point 
 *        (see see https://www.raspberrypi.org/documentation/configuration/wireless/access-point-routed.md)
 *        typical wifi connection times are 170ms and the total "switch" event from start to end of setup()
 *        is < 1 sec.
 * 
 *  Access Point Portal Configuration params:
 *    location: the physical location in mqtt topic terms that should match the publish and subscribe topics 
 *      e.g. "A/4/S" means "Antonis house/4th floor/Study" and a corresponding publish topic would be 
 *      "A/4/S/SWITCH/S1/state" i.e. location/Type/ID/state, a corresponding publish topic would be
 *      "A/4/S/SWITCH/S1/set"  i.e. location/Type/ID/set
 *    sleep seconds: 
 *      -0: sleep forever until external reset
 *      -xxx: wake up after xxx seconds and send a configuration mqtt message. If xxx > MAX_SLEEP_SECONDS
 *            wake up after MAX_SLEEP_SECONDS seconds.
 * 
 *  IMPORTANT: After ESP8266 goes in deep sleep there are several events that can wake it up: (from user_interface.h)
 *    REASON_DEFAULT_RST      = 0,    normal startup by power on
 *    REASON_WDT_RST          = 1,    hardware watch dog reset
 *    REASON_EXCEPTION_RST    = 2,    exception reset, GPIO status won’t change
 *    REASON_SOFT_WDT_RST     = 3,    software watch dog reset, GPIO status won’t change
 *    REASON_SOFT_RESTART     = 4,    software restart ,system_restart , GPIO status won’t change
 *    REASON_DEEP_SLEEP_AWAKE = 5,    wake up from deep-sleep
 *    REASON_EXT_SYS_RST      = 6     external system reset
 *    Trying to reset by pressing the RESET button, or even trying to disconnect and reconnect VCC the
 *    wake up reason is always REASON_DEEP_SLEEP_AWAKE which is the same as waking up by the RTC_timer.
 *    However, when disconnecting and reconnecting (via a push button) the CH_EN pin to +3.3V the wake
 *    up reason is REASON_DEFAULT_RST which differentiates from REASON_DEEP_SLEEP_AWAKE. Also if the CH_EN
 *    pin is disconnected and reconnected while the ESP8266 has not gone to deep sleep yet, it still 
 *    reboots with REASON_DEFAULT_RST.
 *    RECOMMENDATION: Use a falling edge one shot timer with an output pulse of about 15 secs to cover
 *    the case that ESP8266 takes a very long time to connect (althought if this happens all the time
 *    it will drain the battery very quickly and gives a very large lag between pushing the switch and
 *    seeing the corresponding light turn on). See https://youtu.be/vmS5YQITRQ0 and https://www.petervis.com/GCSE_Design_and_Technology_Electronic_Products/falling-edge-triggered-monostable/falling-edge-triggered-monostable.html
 *    A TLC555 works with 3.3V VCC and can be powered from the same sourve as the ESP8266.
 *    Feed this pulse to CH_EN to turn ESP8266 on for max 15 secs. Normally ESP8266 will connect and send 
 *    an mqtt "Event" message in less than a second and then go to deep sleep.
 */


#include <ESP8266WiFi.h>
#include <PubSubClient.h>

//needed for library
#include <ESP8266WebServer.h>
#include <DNSServer.h>

#include <ArduinoOTA.h>

#include "Settings.h"
#include "MQTT.h"
// #if USE_WIFIMANAGER == 1
#include "WifiManagerWrapper.h"
// #endif
#include <FS.h>

// The following line is required to allow ESP to measure Vcc
// see https://arduino-esp8266.readthedocs.io/en/stable/libraries.html#esp-specific-apis
ADC_MODE( ADC_VCC );  

bool OTA = false; // when OTA is true the device will stay on to receive OTA updates

bool active = true;  // if the switch is not active, upon start it will not generate any mqtt messages

// connectionTime stores the elapsed time between start of wifi.connect() and the moment when either 
// WiFi.status() == WL_CONNECTED or timeout
unsigned long connectionTime = 0; 

#ifdef TWOGANG_SWITCH
bool button1Pressed = false;
bool button2Pressed = false;
#endif

//Static IP address configuration
// IPAddress gateway(192, 168, 1, 254);   //IP Address of home WiFi Router
// IPAddress staticIP(192, 168, 1, 200); //ESP static ip
// uint8 bssid[6] = { 0xDC, 0xF8, 0xB9, 0x9C, 0x4D, 0x33 };
// int32_t wifiChannel = 6;
IPAddress gateway(192, 168, 2, 1);   //IP Address of rpi WiFi Router
IPAddress staticIP(192, 168, 2, 10); //ESP static ip
uint8 bssid[6] = { 0xb8, 0x27, 0xeb, 0x00, 0x5a, 0x18 };
int32_t wifiChannel = 7;
const char* ssid = "ahat2";
const char* password = "312ggp12";
// IPAddress gateway(192, 168, 126, 101);   //IP Address of S-10 WiFi Router
// IPAddress staticIP(192, 168, 126, 192); //ESP static ip
// uint8 bssid[6] = { 0x6C, 0xC7, 0xEC, 0xBA, 0xCC, 0xB2 };
// int32_t wifiChannel = 6;
IPAddress subnet(255, 255, 255, 0);  //Subnet mask
// IPAddress dns1(192, 168, 1, 254);  //DNS
// IPAddress dns1(8,8,8,8);  //DNS
// IPAddress dns2(8,8,8,8);  //DNS

const char* deviceName = "wifi-switch";

// default values
// const char* ssid = "ahat";
// const char* ssid = "AndroidAP_5960";
// const char* password = "423hh[23";
// char mqtt_server[40];
// char mqtt_port[6];
// char publish_topic[256];
// char subscribe_topic[256];
const char* mqtt_server = "192.168.2.1";
const char* mqtt_port = "1883";
const char* publish_topic = "A/4/S/SWITCH/S1/state";
const char* subscribe_topic = "A/4/S/SWITCH/S1/set";
const char* configurator_publish_topic = "A///CONFIGURATION/C/cmd";
const char* configurator_subscribe_topic = "A///CONFIGURATION/C/report";
const char* location = "A/4/S";

void wifi_portal_idle();
void mqtt_callback( char* topic, byte* payload, unsigned int length );

Configuration configuration;
WiFiClient espClient;
MQTT mqtt( configuration, espClient );

unsigned long start = millis();

// #if USE_WIFIMANAGER == 1
void wifi_portal_idle()
{
  // This runs with almost no delay, do not print to Serial or it will "clog" the output terminal
  // Serial.println( "Doing other staff while wifi portal is idle" );
  mqtt.loop();
  //there is no point in putting this here because the pc that uploads the code must first connect to the AP
  // instead use the OTA flag and put this in loop()
  //ArduinoOTA.handle(); 
}
WifiManagerWrapper wifiManagerWrapper( configuration, mqtt, wifi_portal_idle );
// #endif


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

// for an explanation see https://thingpulse.com/max-deep-sleep-for-esp8266/
// TL;DR max sleep interval is around 3:35h – 3:50h. So if configured sleep time
// is > 3:30 i.e. 12600 secs wake up and sleep again
void deepSleep()
{
  long sleepSeconds = configuration.switchDevice.sleep_seconds.toInt();
  Serial.print( F("Configuration sleep_seconds: ") ); Serial.println( sleepSeconds );
  Serial.print( F("Final sleep seconds ") ); Serial.println( String( configuration.getFinalSleepSeconds() ) );
  uint64_t sleepTime = sleepSeconds*1000000;
  ESP.deepSleep( sleepTime );
}


void publishConfiguration()
{
  const rst_info* resetInfo = ESP.getResetInfoPtr();
  String msg(
    String( "{ " ) +
    "\"cmd\": \"ITEM_UPDATE\"" +
    ", \"data\": { " +
    "\"type\": \"" + DEVICE_TYPE + "\"" +
    ", \"domain\": \"" + DEVICE_DOMAIN + "\"" +
    ", \"firmware\": \"" + FIRMWARE + "\"" +
    ", \"version\": \"" + VERSION + "\"" +
    ", \"protocol\": \"mqtt\"" +
    ", \"name\": \"" + configuration.mqtt.device_name + "\"" +
    ", \"id\": \"" + configuration.mqtt.client_id + "\"" +
    ", \"location\": \"" + location + "\"" +
    ", \"publish\": \"" + publish_topic + "\"" +
    ", \"subscribe\": \"" + subscribe_topic + "\"" +
    ", \"ip\": \"" + WiFi.localIP().toString() + "\"" +
    ", \"SSID\": \"" + WiFi.SSID() + "\"" +
    ", \"BSSID\": \"" + WiFi.BSSIDstr() + "\"" +
    ", \"wifi channel\": \"" + WiFi.channel() + "\"" +
    ", \"wifi RSSI\": \"" + WiFi.RSSI() + "\"" +
    ", \"VCC\": \"" + ESP.getVcc() + "\"" +
    ", \"active\": \"" + String( active ) + "\"" +
    ", \"wake up\": \"" + ESP.getResetReason() + "\" (" + resetInfo->reason + ")" +
    ", \"connection time\": \"" + connectionTime + "\"" +
#ifdef TWOGANG_SWITCH
    ", \"button1Pressed\": \"" + String( button1Pressed ) + "\"" +
    ", \"button2Pressed\": \"" + String( button2Pressed ) + "\"" +
#endif
    ", \"sleep seconds config/final\": \"" + configuration.switchDevice.sleep_seconds + "/" + configuration.getFinalSleepSeconds() + "\"" +
    
  " } }" );
  mqtt.publish( configurator_publish_topic, msg, false );
}

void publishReport()
  {
    const rst_info* resetInfo = ESP.getResetInfoPtr();
    String msg(
    String( "{ " ) +
    "\"msg\": \"EVENT\"" +
    ", \"data\": { " +
    "\"type\": \"" + DEVICE_TYPE + "\"" +
    ", \"domain\": \"" + DEVICE_DOMAIN + "\"" +
    ", \"firmware\": \"" + FIRMWARE + "\"" +
    ", \"version\": \"" + VERSION + "\"" +
    ", \"protocol\": \"mqtt\"" +
    ", \"name\": \"" + configuration.mqtt.device_name + "\"" +
    ", \"id\": \"" + configuration.mqtt.client_id + "\"" +
    ", \"location\": \"" + location + "\"" +
    ", \"publish\": \"" + publish_topic + "\"" +
    ", \"subscribe\": \"" + subscribe_topic + "\"" +
    ", \"ip\": \"" + WiFi.localIP().toString() + "\"" +
    ", \"wifi RSSI\": \"" + WiFi.RSSI() + "\"" +
    ", \"VCC\": \"" + ESP.getVcc() + "\"" +    
    ", \"wake up\": \"" + ESP.getResetReason() + "\" (" + resetInfo->reason + ")" +
    ", \"connection time\": \"" + connectionTime + "\"" +
#ifdef TWOGANG_SWITCH
    ", \"button1Pressed\": \"" + String( button1Pressed ) + "\"" +
    ", \"button2Pressed\": \"" + String( button2Pressed ) + "\"" +
#endif
    ", \"sleep seconds config/final\": \"" + configuration.switchDevice.sleep_seconds + "/" + configuration.getFinalSleepSeconds() + "\"" +

  " } }" );
    mqtt.publish( publish_topic, msg, false );
  }

void setup() 
{
  // uint8 option : RF initialization when power up.
  // 0 : RF initialization when power up depends on esp_init_data_default.bin(0 127byte) byte
  // 114. More details in appendix of documentation "2A-ESP8266-
  // SDK_Getting_Started_Guide_v1.4".
  // 1 : RF initialization only calibrate VDD33 and TX power which will take about 18 ms; this
  // reduces the current consumption.
  // 2 : RF initialization only calibrate VDD33 which will take about 2 ms; this has the least
  // current consumption.
  // 3 : RF initialization will do the whole RF calibration which will take about 200 ms; this
  // increases the current consumption.
  // system_phy_set_powerup_option(3);

  //  system_phy_set_tpw_via_vdd33(3300);

  Serial.begin( 115200 );
  wifi_set_sleep_type( NONE_SLEEP_T );

#ifdef TWOGANG_SWITCH
  // NOTE: The following code needs to execute as soon as possible after boot in order
  // to read the flip-flops that store the button states and reset the flip-flops so
  // that they are ready to as soon as possible receive and store another button push 

  //read flip flops
  pinMode( Q1, INPUT );
  pinMode( Q2, INPUT );
  pinMode( FLIPFLOP_RESET, OUTPUT );

  button1Pressed = digitalRead( Q1 ) == HIGH;
  button2Pressed = digitalRead( Q2 ) == HIGH;

  Serial.println( "Button 1 " + String( button1Pressed ? "WAS" : "NOT" ) + " pressed" );
  Serial.println( "Button 2 " + String( button2Pressed ? "WAS" : "NOT" ) + " pressed" );

  delay( 10 );
  digitalWrite( FLIPFLOP_RESET, HIGH );
  delay( 10 );
  digitalWrite( FLIPFLOP_RESET, LOW );

  Serial.println( "Button 1 " + String( digitalRead( Q1 ) == LOW ? "IS" : "NOT" ) + " reset" );
  Serial.println( "Button 2 " + String( digitalRead( Q2 ) == LOW ? "IS" : "NOT" ) + " reset" );
#endif

  configuration.setup();
  
  // For debugging/testing
  // // Setup some initial values to mqtt params before wifimanager attempts to read from storage or get from AP
  // // IMPORTANT NOTE: access of member variables is allowed only inside function blocks!
  // // The following lines will produce "error: 'mqtt' does not name a type" if placed outside function setup()
  // configuration.mqtt.device_name = "Διακόπτης επίδειξης";
  // configuration.mqtt.client_id = "switch1";
  // configuration.mqtt.location = location;
  // configuration.mqtt.server = mqtt_server;
  // configuration.mqtt.port = mqtt_port;
  // configuration.mqtt.publish_topic = publish_topic;
  // configuration.mqtt.subscribe_topic = subscribe_topic;
  // configuration.mqtt.configurator_publish_topic = configurator_publish_topic;
  // configuration.mqtt.configurator_subscribe_topic = configurator_subscribe_topic;

  active = configuration.switchDevice.active == "true";

  // NOTE: mqtt setup must run before wifiManagerProxy because wifiManagerWrapper may get new values and will then
  // run mqtt.setup() again with the new values
  mqtt.setup( mqtt_callback );
  Serial.println( F( "mqttSetup finished" ) );

  int vdd = ESP.getVcc();
  Serial.print( F("VDD: ") ); Serial.println( String( vdd ) );
  
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

  Serial.print( F("Reset reason: ") ); Serial.println( ESP.getResetReason() );
  const rst_info* resetInfo = ESP.getResetInfoPtr();

  if( mqtt.connect() )
  {
    // IMPORTANT: if this device subscribes to a topic at the time of connection and if mqtt.loop() 
    // is ommited the publishConfiguration() mqtt message is reported as successfully published 
    // but it never arrives at the mqtt broker (as observed in the logs of the broker). 
    // In such a case a delay( ??? ) is required before mqtt.publish
    // delay( 5000 );
    // If ESP8266 is active and it was reset externally (see notes at the top of this file)
    // i.e. by a button press send mqtt "click event" message
    if( active && resetInfo->reason == REASON_DEFAULT_RST )
    {
      publishReport();
    }
    // IMPORTANT: without a delay before mqtt.loop() the mqtt message is reported as successfully
    // published but it never arrives at the mqtt broker (as observed in the logs of the broker)
    delay( 10 );
    mqtt.loop();  // receive any messages
    delay( 200 );
  }
  else
  {
    Serial.println( F("MQTT connection failed. Changing to WIFI AP Setup mode") );
    // We want wifimanager to collect fresh parameters.
    wifiManagerWrapper.startAPWithoutConnecting();
  }
  
  if( !OTA )
  {
    WiFi.mode( WIFI_OFF );
  }
  unsigned long finish = millis();
  unsigned long total = finish - start;
  Serial.print( F("Complete setup finished in ") ); Serial.print( String( total ) ); Serial.println( F(" milliseconds") );

  if( !OTA )
  {
    deepSleep();
  }
}

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

  Serial.println( "ArduinoOTA setup finished" );
}

void loop() 
{
  if( OTA )
  {
    ArduinoOTA.handle(); 
    delay( 200 );
  }

  return;
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

void mqtt_callback( char* _topic, byte* _payload, unsigned int length )
{
  String topic( _topic );
  char payload[length];
  memcpy( payload, _payload, length );
  Serial.print( F("Message arrived [") );
  Serial.print( _topic );
  Serial.print( F("] => {" ) ); Serial.print( topic ); Serial.println( F("}") );

  // if I connect with qos 0 no messages are received
  // if I connect with qos 2 no messages are received
  // if I connect with qos 1, the received message is received every time I reconnect with qos 1
  // so I disconnect and reconnect with cleanSession = true to get read of received message
  // NOTE: after disconnect() params char* _topic and byte* _payload is no longer valid
  // that's why I copy them to local variables
  mqtt.disconnect();
  mqtt.connect( true ); 

  // Serial.println( "subscribe_topic: [" + mqtt.subscribe_topic + "], _configurator_subscribe_topic: [" + mqtt.configurator_subscribe_topic + "]" );

  if( topic == mqtt.subscribe_topic )
  {
    for (unsigned int i=0;i<length;i++)
    {
      char receivedChar = (char)payload[i];
      Serial.println(receivedChar);
      if( receivedChar == 'r' )
      {
        //report
        publishReport();
      }
      else if( receivedChar == 'w' )
      {
        //go to access point mode
        Serial.println( "Changing to WIFI AP Setup mode" );
        // We want wifimanager to collect fresh parameters.
        wifiManagerWrapper.startAPWithoutConnecting();
      }
      else if( receivedChar == 'a' )
      {
        activate();
        publishReport();        
      }
      else if( receivedChar == 'd' )
      {
        //deactivate
        deactivate();
        publishReport();
      }
      else if ( receivedChar == 'o' )
      {
        OTA = true;
        Serial.println( F("Changing to OTA mode") );
        OTASetup();
      }
    }
  }
  else if( topic == mqtt.configurator_subscribe_topic )
  {
    publishConfiguration();
  }
  else
  {
    Serial.println( F(" ignoring unknown topic...") );
  }
}
