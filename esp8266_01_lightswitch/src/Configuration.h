#ifndef _configuration_h_
#define _configuration_h_

#include <Arduino.h>
#include <FS.h> //for WiFiManager this needs to be first, or it all crashes and burns...
#include <ArduinoJson.h>  //https://github.com/bblanchon/ArduinoJson

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
    String subscribe_topic;
    String configurator_publish_topic;
    String configurator_subscribe_topic;
  } MQTTConfiguration;
  MQTTConfiguration mqtt;

  typedef struct
  {
    String active;
    String sleep_seconds;
  } SwitchDeviceConfiguration;
  SwitchDeviceConfiguration switchDevice;

  Configuration();

  void setup();
  bool read();
  void write();
  void deleteConfigFile();

  unsigned long getFinalSleepSeconds();
};

#endif
