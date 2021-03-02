#include "Configuration.h"

Configuration::Configuration()
{  
}

void Configuration::setup()
{
    read();
}

bool Configuration::read()
{
  //read configuration from FS json
  Serial.println("mounting FS...");

  if (SPIFFS.begin())
  {
    Serial.println("mounted file system");
    if (SPIFFS.exists( configFileName ))
     {
      //file exists, reading and loading
      Serial.println("reading config file");
      File configFile = SPIFFS.open( configFileName , "r");
      if( configFile )
      {
        Serial.println("opened config file");
        size_t size = configFile.size();
        // Allocate a buffer to store contents of the file.
        std::unique_ptr<char[]> buf(new char[size]);

        configFile.readBytes(buf.get(), size);
        DynamicJsonBuffer jsonBuffer;
        JsonObject& json = jsonBuffer.parseObject(buf.get());
        json.printTo(Serial);
        if( json.success() )
        {
          Serial.println("\nparsed json");
          Serial.println( "SSID: " + json["SSID"].as<String>() + ", password: " + json["password"].as<String>() );

          wifi.bssid = json["bssid"].as<String>();
          wifi.wifiChannel = json["wifiChannel"].as<String>();
          wifi.gateway = json["gateway"].as<String>();
          wifi.staticIP = json["staticIP"].as<String>();
          wifi.subnet = json["subnet"].as<String>();
          wifi.SSID = json["SSID"].as<String>();
          wifi.password = json["password"].as<String>();

          mqtt.device_name = json["device_name"].as<String>();
          mqtt.client_id = json["mqtt_client_id"].as<String>();
          mqtt.location = json["mqtt_location"].as<String>();
          mqtt.server = json["mqtt_server"].as<String>();
          mqtt.port = json["mqtt_port"].as<String>();
          mqtt.publish_topic = json["mqtt_publish_topic"].as<String>();
          mqtt.subscribe_topic = json["mqtt_subscribe_topic"].as<String>();
          mqtt.configurator_publish_topic = json["mqtt_configurator_publish_topic"].as<String>();
          mqtt.configurator_subscribe_topic = json["mqtt_configurator_subscribe_topic"].as<String>();

          switchDevice.active = json["active"].as<String>();

          return true;
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
  return false;
}

void Configuration::write()
{
  Serial.println("saving config");
  DynamicJsonBuffer jsonBuffer;
  JsonObject& json = jsonBuffer.createObject();
  json["bssid"] = wifi.bssid;
  json["wifiChannel"] = wifi.wifiChannel;
  json["gateway"] = wifi.gateway;
  json["staticIP"] = wifi.staticIP;
  json["subnet"] = wifi.subnet;
  json["SSID"] = wifi.SSID;
  json["password"] = wifi.password;
  json["device_name"] = mqtt.device_name;
  json["mqtt_client_id"] = mqtt.client_id;
  json["mqtt_location"] = mqtt.location;
  json["mqtt_server"] = mqtt.server;
  json["mqtt_port"] = mqtt.port;
  json["mqtt_publish_topic"] = mqtt.publish_topic;
  json["mqtt_subscribe_topic"] = mqtt.subscribe_topic;
  json["mqtt_configurator_publish_topic"] = mqtt.configurator_publish_topic;
  json["mqtt_configurator_subscribe_topic"] = mqtt.configurator_subscribe_topic;
  json["active"] = switchDevice.active;

  File configFile = SPIFFS.open( configFileName , "w");
  if( !configFile )
  {
    Serial.println("failed to open config file for writing");
  }

  json.printTo(Serial);
  json.printTo(configFile);
  configFile.close();
}

void Configuration::deleteConfigFile()
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
