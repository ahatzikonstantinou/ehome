#include "WifiManagerWrapper.h"
#include "Buzzer.h"


//callback notifying us of the need to save config
void saveWifiManagerConfigCallback()
{
  Serial.println("Should save config");
  WifiManagerWrapper::shouldSaveConfig = true;
}

bool WifiManagerWrapper::shouldSaveConfig = false;

void WifiManagerWrapper::autoconnectWithOldValues()
{
  connectWithOldCredentials = true;
  resetSettings = false;
  setup( true );  //attemp to AutoConnect
}

void WifiManagerWrapper::startAPWithoutConnecting( bool timeout )
{
  // Delete the config file to prevent wifimanager from connecting. We want wifimanager to collect fresh parameters.
  resetSettings = true; //deleteConfigFile();
  setup( false, timeout );
}

void WifiManagerWrapper::initFromConfiguration()
{
  SSID = configuration->wifi.SSID;
  password = configuration->wifi.password;
  reconnects = configuration->wifi.reconnects;
}

// if autoConnect = true wifimanager will attempt to connect with previous known SSID and password
// else it will try ondemand configuration
void WifiManagerWrapper::setup( bool autoConnect, bool timeout )
{
  initFromConfiguration();

  // The extra parameters to be configured (can be either global or just in the setup)
  // After connecting, parameter.getValue() will get you the configured value
  // id/name placeholder/prompt default length
  WiFiManagerParameter custom_device_name( "device_name", "device name", mqtt->device_name.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_client_id( "mqtt_client_id", "mqtt client id", mqtt->client_id.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_location( "mqtt_location", "mqtt location", mqtt->location.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_server( "mqtt_server", "mqtt server", mqtt->server.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_port( "mqtt_port", "mqtt port", mqtt->port.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_publish_topic( "mqtt_publish_topic", "mqtt publish topic", mqtt->publish_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_subscribe_topic( "mqtt_subscribe_topic", "mqtt subscribe topic", mqtt->subscribe_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_configurator_publish_topic( "mqtt_configurator_publish_topic", "mqtt configurator publish topic", mqtt->configurator_publish_topic.c_str(), 128, " required" );
  WiFiManagerParameter custom_mqtt_configurator_subscribe_topic( "mqtt_configurator_subscribe_topic", "mqtt configurator subscribe topic", mqtt->configurator_subscribe_topic.c_str(), 128, " required" );

  //WiFiManager
  //Local intialization. Once its business is done, there is no need to keep it around
  WiFiManager wifiManager( portal_idle_callback );

  //set config save notify callback
  wifiManager.setSaveConfigCallback( saveWifiManagerConfigCallback );

  //set static ip
  // wifiManager.setSTAStaticIPConfig(IPAddress(10,0,1,99), IPAddress(10,0,1,1), IPAddress(255,255,255,0));

  //add all your parameters here
  wifiManager.addParameter( &custom_device_name );
  wifiManager.addParameter( &custom_mqtt_client_id );
  wifiManager.addParameter( &custom_mqtt_location );
  wifiManager.addParameter( &custom_mqtt_server );
  wifiManager.addParameter( &custom_mqtt_port );
  wifiManager.addParameter( &custom_mqtt_publish_topic );
  wifiManager.addParameter( &custom_mqtt_subscribe_topic );
  wifiManager.addParameter( &custom_mqtt_configurator_publish_topic );
  wifiManager.addParameter( &custom_mqtt_configurator_subscribe_topic );

  //check if must reset settings
  if( resetSettings )
  {
    resetSettings = false; //reset the flag
    wifiManager.resetSettings();
  }

  //set minimum quality of signal so it ignores AP's under that quality
  //defaults to 8%
  //wifiManager.setMinimumSignalQuality();

  //sets timeout until configuration portal gets turned off
  //useful to make it all retry or go to sleep
  //in seconds
  if( timeout )
  {
    wifiManager.setTimeout( WIFIMANAGER_PORTAL_TIMEOUT_SECS );
  }

  Buzzer::playWifiPortalStart();
  if( autoConnect )
  {
    if( connectWithOldCredentials )
    {
      connectWithOldCredentials = false; //reset it
      if( !wifiManager.autoConnect( String( String( "AutoConnectAP-" ) + mqtt->device_name ).c_str(), NULL, SSID.c_str(), password.c_str() ) )
      {
        Serial.println( "AutoConnectAP with old credentials \"" + SSID + "\", \"" + password + "\" failed to connect and hit timeout" );

        reconnects++;
        // saveJsonConfig( SSID, password ); //keep the last saved credentials because the current connection attempt failed
        saveConfiguration(); //keep the last saved credentials because the current connection attempt failed
        Serial.println( "Saved " + String( reconnects ) + " reconnects in jsonConfig" );

        //reset and try again
        Buzzer::playRestart();
        ESP.restart(); //ESP.reset(); reset() will leave the ESP frozen. restart will leave it frozen only the first time after software upload from usb. A reset with the nodemcu button will fix this.
      }
    }
    //fetches ssid and pass and tries to connect
    //if it does not connect it starts an access point with the specified name
    //here  "AutoConnectAP"
    //and goes into a blocking loop awaiting configuration
    else if( !wifiManager.autoConnect( String( String( "AutoConnectAP-" ) + mqtt->device_name ).c_str() ) )
    {
      Serial.println( "AutoConnectAP failed to connect and hit timeout" );

      reconnects++;
      // saveJsonConfig( SSID, password ); //keep the last saved credentials because the current connection attempt failed
      saveConfiguration(); //keep the last saved credentials because the current connection attempt failed
      Serial.println( "Saved " + String( reconnects ) + " reconnects in jsonConfig" );

      //reset and try again
      Buzzer::playRestart();
      ESP.restart(); //ESP.reset(); reset() will leave the ESP frozen. restart will leave it frozen only the first time after software upload from usb. A reset with the nodemcu button will fix this.
    }
  }
  else
  {
    WiFi.mode( WIFI_STA );
    WiFi.disconnect();
    delay( 2000 );
    if( !wifiManager.startConfigPortal( String( String( "OnDemandAP-" ) + mqtt->device_name ).c_str() ) )
    {
      Serial.println( "OnDemandAP failed to connect and hit timeout" );

      reconnects++;
      // saveJsonConfig( SSID, password ); //keep the last saved credentials because the current connection attempt failed
      saveConfiguration(); //saveJsonConfig( SSID, password ); //keep the last saved credentials because the current connection attempt failed
      Serial.println( "Saved " + String( reconnects ) + " reconnects in jsonConfig" );

      //reset and try again
      Buzzer::playRestart();
      ESP.restart(); //ESP.reset();
    }
  }

  reconnects = 0;
  Buzzer::playWifiConnected();
  //if you get here you have connected to the WiFi
  Serial.println("connected...yeey :)");

  //read updated parameters
  configuration->wifi.SSID = wifiManager.getSSID();
  configuration->wifi.password = wifiManager.getPassword();
  configuration->wifi.reconnects = reconnects;
  configuration->mqtt.device_name = custom_device_name.getValue();
  configuration->mqtt.client_id = custom_mqtt_client_id.getValue();
  configuration->mqtt.location = custom_mqtt_location.getValue();
  configuration->mqtt.server = custom_mqtt_server.getValue();
  configuration->mqtt.port = custom_mqtt_port.getValue();
  configuration->mqtt.publish_topic = custom_mqtt_publish_topic.getValue();
  configuration->mqtt.subscribe_topic = custom_mqtt_subscribe_topic.getValue();
  configuration->mqtt.configurator_publish_topic = custom_mqtt_configurator_publish_topic.getValue();
  configuration->mqtt.configurator_subscribe_topic = custom_mqtt_configurator_subscribe_topic.getValue();

  mqtt->setup();  //re-setup mqtt based on the new configuration values

  //save the custom parameters to FS
  if( WifiManagerWrapper::shouldSaveConfig )
  {
    // saveJsonConfig( wifiManager.getSSID(), wifiManager.getPassword() );
    saveConfiguration();
  }

  Serial.println("local ip");
  Serial.println( WiFi.localIP() );
}

void WifiManagerWrapper::saveConfiguration()
{
  configuration->write();
}

void WifiManagerWrapper::resetReconnects()
{
  initFromConfiguration();
  reconnects = 0;
  configuration->wifi.reconnects = reconnects;
  saveConfiguration(); //saveJsonConfig( SSID, password );
  Serial.println( "Saved " + String( reconnects ) + " reconnects in configuration" );
}

bool WifiManagerWrapper::reconnectsExceeded()
{
  return reconnects > MAX_WIFIMANAFER_RECONNECTS;
}
