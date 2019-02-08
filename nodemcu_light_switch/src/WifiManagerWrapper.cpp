#include "WifiManagerWrapper.h"
#include <FS.h> //for WiFiManager this needs to be first, or it all crashes and burns...
#include <ArduinoJson.h>  //https://github.com/bblanchon/ArduinoJson
#include <WiFiManager.h>  //https://github.com/tzapu/WiFiManager


//callback notifying us of the need to save config
void saveWifiManagerConfigCallback()
{
  Serial.println("Should save config");
  WifiManagerWrapper::shouldSaveConfig = true;
}

bool WifiManagerWrapper::shouldSaveConfig = false;


void WifiManagerWrapper::startAPWithoutConnecting()
{
  // Delete the config file to prevent wifimanager from connecting. We want wifimanager to collect fresh parameters.
  deleteConfigFile();
  setup( false );
}

void WifiManagerWrapper::deleteConfigFile()
{
  if( SPIFFS.begin() )
  {
    Serial.println("mounted file system");
    if( SPIFFS.exists( configFileName ) )
    {
      SPIFFS.remove( configFileName );
      Serial.println( "deleted json configuration file." );
    }
  }
}

// if autoConnect = true wifimanager will attempt to connect with previous known SSID and password
// else it will try ondemand configuration
void WifiManagerWrapper::setup( bool autoConnect )
{
  //read configuration from FS json
  Serial.println("mounting FS...");

  if (SPIFFS.begin()) {
    Serial.println("mounted file system");
    if (SPIFFS.exists( configFileName )) {
      //file exists, reading and loading
      Serial.println("reading config file");
      File configFile = SPIFFS.open( configFileName , "r");
      if (configFile) {
        Serial.println("opened config file");
        size_t size = configFile.size();
        // Allocate a buffer to store contents of the file.
        std::unique_ptr<char[]> buf(new char[size]);

        configFile.readBytes(buf.get(), size);
        DynamicJsonBuffer jsonBuffer;
        JsonObject& json = jsonBuffer.parseObject(buf.get());
        json.printTo(Serial);
        if (json.success()) {
          Serial.println("\nparsed json");

          mqtt->device_name = json["device_name"].as<String>();
          mqtt->client_id = json["mqtt_client_id"].as<String>();
          mqtt->location = json["mqtt_location"].as<String>();
          mqtt->server = json["mqtt_server"].as<String>();
          mqtt->port = json["mqtt_port"].as<String>();
          mqtt->publish_topic = json["mqtt_publish_topic"].as<String>();
          mqtt->subscribe_topic = json["mqtt_subscribe_topic"].as<String>();
          mqtt->configurator_publish_topic = json["mqtt_configurator_publish_topic"].as<String>();
          mqtt->configurator_subscribe_topic = json["mqtt_configurator_subscribe_topic"].as<String>();
        }
        else
        {
          Serial.println("failed to load json config");
        }
      }
    }
  }
  else
  {
    Serial.println("failed to mount FS");
  }
  //end read

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
  WiFiManager wifiManager;

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

  //reset settings - for testing
  //wifiManager.resetSettings();

  //set minimum quality of signal so it ignores AP's under that quality
  //defaults to 8%
  //wifiManager.setMinimumSignalQuality();

  //sets timeout until configuration portal gets turned off
  //useful to make it all retry or go to sleep
  //in seconds
  wifiManager.setTimeout( WIFIMANAGER_PORTAL_TIMEOUT_SECS );

  if( autoConnect )
  {
    //fetches ssid and pass and tries to connect
    //if it does not connect it starts an access point with the specified name
    //here  "AutoConnectAP"
    //and goes into a blocking loop awaiting configuration
    if( !wifiManager.autoConnect( String( String( "AutoConnectAP-" ) + mqtt->device_name ).c_str() ) )
    {
      Serial.println( "AutoConnectAP failed to connect and hit timeout" );
      //reset and try again
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
      //reset and try again
      ESP.restart(); //ESP.reset();
    }
  }

  //if you get here you have connected to the WiFi
  Serial.println("connected...yeey :)");

  //read updated parameters
  mqtt->device_name = custom_device_name.getValue();
  mqtt->client_id = custom_mqtt_client_id.getValue();
  mqtt->location = custom_mqtt_location.getValue();
  mqtt->server = custom_mqtt_server.getValue();
  mqtt->port = custom_mqtt_port.getValue();
  mqtt->publish_topic = custom_mqtt_publish_topic.getValue();
  mqtt->subscribe_topic = custom_mqtt_subscribe_topic.getValue();
  mqtt->configurator_publish_topic = custom_mqtt_configurator_publish_topic.getValue();
  mqtt->configurator_subscribe_topic = custom_mqtt_configurator_subscribe_topic.getValue();

  //save the custom parameters to FS
  if( WifiManagerWrapper::shouldSaveConfig )
  {
    Serial.println("saving config");
    DynamicJsonBuffer jsonBuffer;
    JsonObject& json = jsonBuffer.createObject();
    json["device_name"] = mqtt->device_name;
    json["mqtt_client_id"] = mqtt->client_id;
    json["mqtt_location"] = mqtt->location;
    json["mqtt_server"] = mqtt->server;
    json["mqtt_port"] = mqtt->port;
    json["mqtt_publish_topic"] = mqtt->publish_topic;
    json["mqtt_subscribe_topic"] = mqtt->subscribe_topic;
    json["mqtt_configurator_publish_topic"] = mqtt->configurator_publish_topic;
    json["mqtt_configurator_subscribe_topic"] = mqtt->configurator_subscribe_topic;

    File configFile = SPIFFS.open( configFileName , "w");
    if( !configFile )
    {
      Serial.println("failed to open config file for writing");
    }

    json.printTo(Serial);
    json.printTo(configFile);
    configFile.close();
    //end save
  }

  Serial.println("local ip");
  Serial.println( WiFi.localIP() );
}
