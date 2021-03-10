#include "WifiManagerWrapper.h"
#include "Settings.h"


//callback notifying us of the need to save config
void saveWifiManagerConfigCallback()
{
  Serial.println("Should save config");
  WifiManagerWrapper::shouldSaveConfig = true;
}

bool WifiManagerWrapper::shouldSaveConfig = false;

unsigned long WifiManagerWrapper::waitForConnection()
{
  unsigned long startTime = millis();
  unsigned long currentTime = 0;
  unsigned long elapsedTime = 0;
  // int i = 0;
  while (WiFi.status() != WL_CONNECTED) { // Wait for the Wi-Fi to connect
    // yield();
    delay(10); // without delay or yield ESP8266 crashes and resets while waiting to connect
    // Serial.print(++i); Serial.print(' ');
    currentTime = millis();
    elapsedTime = currentTime - startTime;
    if( elapsedTime > MAX_WIFI_CONNECTION_MILLIS )
    {
      break;
    }
  }

  return elapsedTime;
}

bool WifiManagerWrapper::connect()
{
  WiFi.mode( WIFI_OFF );
  WiFi.setAutoConnect( false );
  WiFi.setAutoReconnect( false );
  WiFi.hostname( mqtt->device_name );      // DHCP Hostname (useful for finding device for static lease)
  WiFi.config( staticIP, subnet, gateway );//, dns1, dns2);
  WiFi.mode(WIFI_STA);

  Serial.print(F("Connecting to "));
  Serial.print( SSID ); Serial.println(F(" ..."));

  WiFi.begin( SSID, password, wifiChannel, bssid );
  // Serial.println( F("DHCP status: " ) ); Serial.println( String( wifi_station_dhcpc_status() == dhcp_status::DHCP_STOPPED ? "STOPPED" : "STARTED" ) );

  connectionTime = waitForConnection();

  // If connection failed attempt to connect without specifying BSSID and wifiChannel in case
  // the infrastructure has changed e.g. 
  //    1) new rpi access point with same SSID bu tnew mac address and/or channel
  //    2) due to congestion we decided to move rpi SSID to another wifi channel
  if( WiFi.status() != WL_CONNECTED )
  {
    Serial.print( F("Fast connection with BSSID ") ); 
    Serial.print( configuration->wifi.bssid + F(" and wifiChannel ") + String( wifiChannel ) + F(" failed.") );
    Serial.print( F("Trying slow connection, SSID and password only...") );
    WiFi.begin( SSID, password );
    connectionTime = waitForConnection();
    if( WiFi.status() == WL_CONNECTED )
    {
      // update configuration with new BSSID, wifiChannel
      configuration->wifi.bssid = WiFi.BSSIDstr();
      configuration->wifi.wifiChannel = String( WiFi.channel() );
      saveConfiguration();
    }
  }
  
  Serial.println('\n');  
  if( WiFi.status() == WL_CONNECTED )
  {
    Serial.print( F( "Connection completed after " ) ); Serial.println( String( connectionTime ) + " milliseconds" );
    Serial.print( F( "IP address:\t") ); Serial.println( WiFi.localIP());
    Serial.print( F( "Gateway:\t" ) ); Serial.println( WiFi.gatewayIP());
    Serial.print( F( "Subnet:\t" ) ); Serial.println( WiFi.subnetMask());
    Serial.print( F( "SSID: " ) ); Serial.println( WiFi.SSID() );
    Serial.print( F( "BSSID: " ) ); Serial.println( WiFi.BSSIDstr() );
    Serial.print( F( "wifi channel: " ) ); Serial.println( String( WiFi.channel() ) );
    Serial.print( F( "wifi RSSI: " ) ); Serial.println( String( WiFi.RSSI() ) );
    Serial.print( F( "DHCP status: " ) ); Serial.println( String( wifi_station_dhcpc_status() == dhcp_status::DHCP_STOPPED ? "STOPPED" : "STARTED" ) );
  }
  else
  {
    Serial.print( F( "Connection failed after " ) ); Serial.println( String( connectionTime ) + " milliseconds" );
  }

  return WiFi.status() == WL_CONNECTED;
}

void WifiManagerWrapper::startAPWithoutConnecting( bool timeout )
{
  WiFiManagerParameter custom_staticIP( "staticIP", "staticIP", configuration->wifi.staticIP.c_str(), 128, " required" );
  WiFiManagerParameter custom_device_name( "device_name", "device name", mqtt->device_name.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_client_id( "mqtt_client_id", "mqtt client id", mqtt->client_id.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_location( "mqtt_location", "mqtt location", mqtt->location.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_server( "mqtt_server", "mqtt server", mqtt->server.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_port( "mqtt_port", "mqtt port", mqtt->port.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_publish_topic( "mqtt_publish_topic", "mqtt publish topic", mqtt->publish_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_subscribe_cmd_topic( "mqtt_subscribe_cmd_topic", "mqtt subscribe cmd topic", mqtt->subscribe_cmd_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_subscribe_topic( "mqtt_subscribe_topic", "mqtt subscribe topic", mqtt->subscribe_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_configurator_publish_topic( "mqtt_configurator_publish_topic", "mqtt configurator publish topic", mqtt->configurator_publish_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_configurator_subscribe_topic( "mqtt_configurator_subscribe_topic", "mqtt configurator subscribe topic", mqtt->configurator_subscribe_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_switchDevice_sleep_seconds( "switchDevice_sleep_seconds", "sleep seconds", configuration->switchDevice.sleep_seconds.c_str(), 128, " required" );
  WiFiManagerParameter custom_switchDevice_sensor_onmains_read_seconds( "switchDevice_sensor_onmains_read_seconds", "sensor onmains read seconds", configuration->switchDevice.sensor_onmains_read_seconds.c_str(), 128, " required" );
  WiFiManagerParameter custom_switchDevice_sensor_onbattery_read_seconds( "switchDevice_sensor_onbattery_read_seconds", "sensor onbattery read seconds", configuration->switchDevice.sensor_onbattery_read_seconds.c_str(), 128, " required" );

  //WiFiManager
  //Local intialization. Once its business is done, there is no need to keep it around
  WiFiManager wifiManager( portal_idle_callback );

  //sets timeout until configuration portal gets turned off
  //useful to make it all retry or go to sleep
  //in seconds
  if( timeout )
  {
    wifiManager.setTimeout( WIFIMANAGER_PORTAL_TIMEOUT_SECS );
    Serial.println( "Setting wifimanager timeout to " + String( WIFIMANAGER_PORTAL_TIMEOUT_SECS ) + " seconds." );
  }

  //set config save notify callback
  wifiManager.setSaveConfigCallback( saveWifiManagerConfigCallback ); //ahat: this does not seem to work

  //add here all the parameters that you want to appear on the Configuration Portal's page
  // bssid, wifi_channel, subnet and gateway are extracted from WIFI after first connection on new SSID
  wifiManager.addParameter( &custom_staticIP );
  wifiManager.addParameter( &custom_device_name );
  wifiManager.addParameter( &custom_mqtt_client_id );
  wifiManager.addParameter( &custom_mqtt_location );
  wifiManager.addParameter( &custom_mqtt_server );
  wifiManager.addParameter( &custom_mqtt_port );
  wifiManager.addParameter( &custom_mqtt_publish_topic );
  wifiManager.addParameter( &custom_mqtt_subscribe_cmd_topic );
  wifiManager.addParameter( &custom_mqtt_subscribe_topic );
  wifiManager.addParameter( &custom_mqtt_configurator_publish_topic );
  wifiManager.addParameter( &custom_mqtt_configurator_subscribe_topic );
  wifiManager.addParameter( &custom_switchDevice_sleep_seconds );
  wifiManager.addParameter( &custom_switchDevice_sensor_onmains_read_seconds );
  wifiManager.addParameter( &custom_switchDevice_sensor_onbattery_read_seconds );

  delay( 1000 );
  if( !wifiManager.startConfigPortal( String( String( "OnDemandAP-" ) + mqtt->device_name ).c_str() ) )
  {
    Serial.println( "OnDemandAP failed to connect and hit timeout" );

    //reset and try again
    ESP.restart(); //ESP.reset();
  }

  // if we are here, we connected with the new configuration
  // update the configuration and save it
  configuration->wifi.bssid = WiFi.BSSIDstr();
  configuration->wifi.wifiChannel = String( WiFi.channel() );
  configuration->wifi.gateway = WiFi.gatewayIP().toString();
  configuration->wifi.staticIP = WiFi.localIP().toString();
  configuration->wifi.subnet = WiFi.subnetMask().toString();
  configuration->wifi.SSID = wifiManager.getSSID();
  configuration->wifi.password = wifiManager.getPassword();
  configuration->mqtt.device_name = custom_device_name.getValue();
  configuration->mqtt.client_id = custom_mqtt_client_id.getValue();
  configuration->mqtt.location = custom_mqtt_location.getValue();
  configuration->mqtt.server = custom_mqtt_server.getValue();
  configuration->mqtt.port = custom_mqtt_port.getValue();
  configuration->mqtt.publish_topic = custom_mqtt_publish_topic.getValue();
  configuration->mqtt.subscribe_topic = custom_mqtt_subscribe_topic.getValue();
  configuration->mqtt.subscribe_cmd_topic = custom_mqtt_subscribe_cmd_topic.getValue();
  configuration->mqtt.configurator_publish_topic = custom_mqtt_configurator_publish_topic.getValue();
  configuration->mqtt.configurator_subscribe_topic = custom_mqtt_configurator_subscribe_topic.getValue();
  configuration->switchDevice.sleep_seconds = custom_switchDevice_sleep_seconds.getValue();
  configuration->switchDevice.sensor_onmains_read_seconds = custom_switchDevice_sensor_onmains_read_seconds.getValue();
  configuration->switchDevice.sensor_onbattery_read_seconds = custom_switchDevice_sensor_onbattery_read_seconds.getValue();

  mqtt->setup();  //re-setup mqtt based on the new configuration values

  //save the custom parameters to FS
  // the saveWifiManagerConfigCallback does not seem to work
  saveConfiguration();
  
  Serial.println("local ip");
  Serial.println( WiFi.localIP() );
  
}

void WifiManagerWrapper::initFromConfiguration()
{
  // Serial.println( "configuration->wifi.bssid.c_str(): " + String( configuration->wifi.bssid.c_str() ) );
  // return;
  unsigned int _bssid[6];

  sscanf( configuration->wifi.bssid.c_str(),
    "%02x:%02x:%02x:%02x:%02x:%02x",
    &_bssid[0], &_bssid[1], &_bssid[2],
    &_bssid[3], &_bssid[4], &_bssid[5] );
  bssid[0] = _bssid[0];
  bssid[1] = _bssid[1];
  bssid[2] = _bssid[2];
  bssid[3] = _bssid[3];
  bssid[4] = _bssid[4];
  bssid[5] = _bssid[5];
  wifiChannel = configuration->wifi.wifiChannel.toInt();
  gateway.fromString( configuration->wifi.gateway );
  staticIP.fromString( configuration->wifi.staticIP );
  subnet.fromString( configuration->wifi.subnet );
  SSID = configuration->wifi.SSID;
  password = configuration->wifi.password;
}

void WifiManagerWrapper::saveConfiguration()
{
  configuration->write();
}

String WifiManagerWrapper::getSSID()
{
  WiFiManager wifiManager( portal_idle_callback );
  return wifiManager.getSSID();
}

IPAddress WifiManagerWrapper::getLocalIP()
{
  return WiFi.localIP();
}

unsigned long WifiManagerWrapper::getConnectionTime() 
{ 
  return connectionTime; 
}
