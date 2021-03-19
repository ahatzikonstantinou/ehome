#ifndef _configuration_h_
#define _configuration_h_

#include <Arduino.h>
#include <FS.h> //for WiFiManager this needs to be first, or it all crashes and burns...
#include <ArduinoJson.h>  //https://github.com/bblanchon/ArduinoJson
#include "Settings.h"

class Configuration
{
private:
  const String configFileName = "/config.json";

public:
  typedef struct
  {
    String bssid;
    String wifiChannel;
    String gateway;
    String staticIP;
    String subnet;
    String SSID;
    String password;
  } WifiConfiguration;
  WifiConfiguration wifi;

  typedef struct
  {
    String device_name;
    String client_id;
    String location;
    String server;
    String port;
    String publish_topic;

    // the mqtt client listens on this topic for messages containing specific data and
    // the messages are addressed to anyone subscribed to this topic e.g. "wall switch 
    // was pressed"
    String subscribe_topic;     
    
    // the mqtt client listens on this topic for messages containing commands which 
    // are supposed to be addressed specifically to this client e.g. "switch to AP mode"
    String subscribe_cmd_topic; 
    String configurator_publish_topic;
    String configurator_subscribe_topic;
  } MQTTConfiguration;
  MQTTConfiguration mqtt;

  typedef struct
  {
    String active;
    String sleep_seconds;
#ifdef WITH_TEMP_SENSOR          
    String sensor_onmains_read_seconds;
    String sensor_onbattery_read_seconds;
#endif    
  } SwitchDeviceConfiguration;
  SwitchDeviceConfiguration switchDevice;

  Configuration();

  void setup();
  bool read();
  void write();
  void deleteConfigFile();

  unsigned long getFinalSleepSeconds( unsigned long sleepSeconds );
};

#endif
