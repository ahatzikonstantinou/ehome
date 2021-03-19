#include "Configuration.h"
#include "Settings.h"

Configuration::Configuration()
{  
  switchDevice.active = "true";
  switchDevice.sleep_seconds = String( MAX_SLEEP_SECONDS );
#ifdef WITH_TEMP_SENSOR          
  switchDevice.sensor_onmains_read_seconds = String( ON_MAINS_TEMP_REPORT_SECS );
  switchDevice.sensor_onbattery_read_seconds = String( ON_BATTERY_TEMP_REPORT_SECS );
#endif  
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
          mqtt.subscribe_cmd_topic = json["mqtt_subscribe_cmd_topic"].as<String>();          
          mqtt.configurator_publish_topic = json["mqtt_configurator_publish_topic"].as<String>();
          mqtt.configurator_subscribe_topic = json["mqtt_configurator_subscribe_topic"].as<String>();

          switchDevice.active = json["active"].as<String>();
          // The first time an ESP8266 starts, there will be no active entry in json
          // and this will result in an empty string switchDevice.active
          // The following lines ensure that unless explicitly defined as "false"
          // anything else -including the empty string-, is considered to be "true"
          if( switchDevice.active != "false" )
          {
            switchDevice.active = "true";
          }
          switchDevice.sleep_seconds = json["sleep_seconds"].as<String>();
#ifdef WITH_TEMP_SENSOR          
          switchDevice.sensor_onmains_read_seconds = json["sensor_onmains_read_seconds"].as<String>();
          if( switchDevice.sensor_onmains_read_seconds.isEmpty() )
          {
            switchDevice.sensor_onmains_read_seconds = String( ON_MAINS_TEMP_REPORT_SECS );
          }
          switchDevice.sensor_onbattery_read_seconds = json["sensor_onbattery_read_seconds"].as<String>();
          if( switchDevice.sensor_onbattery_read_seconds.isEmpty() )
          {
            switchDevice.sensor_onbattery_read_seconds = String( ON_BATTERY_TEMP_REPORT_SECS );
          }
#endif
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
  json["password"] = wifi.password;
  json["device_name"] = mqtt.device_name;
  json["mqtt_client_id"] = mqtt.client_id;
  json["mqtt_location"] = mqtt.location;
  json["mqtt_server"] = mqtt.server;
  json["mqtt_port"] = mqtt.port;
  json["mqtt_publish_topic"] = mqtt.publish_topic;
  json["mqtt_subscribe_topic"] = mqtt.subscribe_topic;
  json["mqtt_subscribe_cmd_topic"] = mqtt.subscribe_cmd_topic;
  json["mqtt_configurator_publish_topic"] = mqtt.configurator_publish_topic;
  json["mqtt_configurator_subscribe_topic"] = mqtt.configurator_subscribe_topic;
  json["active"] = switchDevice.active;
  json["sleep_seconds"] = switchDevice.sleep_seconds;
#ifdef WITH_TEMP_SENSOR          
  json["sensor_onmains_read_seconds"] = switchDevice.sensor_onmains_read_seconds;
  json["sensor_onbattery_read_seconds"] = switchDevice.sensor_onbattery_read_seconds;
#endif

  File configFile = SPIFFS.open( configFileName , "w");
  if( !configFile )
  {
    Serial.println("failed to open config file for writing");
  }

  json.printTo(Serial); Serial.println();
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

unsigned long Configuration::getFinalSleepSeconds( unsigned long sleepSeconds )
{
  if( sleepSeconds > MAX_SLEEP_SECONDS )
  {
    return MAX_SLEEP_SECONDS;
  }
  return sleepSeconds;
}
