#ifndef _wifimanagerwrapper_h_
#define _wifimanagerwrapper_h_

#include "MQTT.h"
#include <ArduinoJson.h>

void saveWifiManagerConfigCallback();

class WifiManagerWrapper
{
private:
  MQTT* mqtt;
  const String configFileName = "/config.json";
  bool resetSettings = false;
  bool connectWithOldCredentials = false;
  unsigned int reconnects = 0;
  String SSID = "";
  String password = "";
  void saveJsonConfig( String ssid, String password );

public:
  static bool shouldSaveConfig; //flag for saving data

  WifiManagerWrapper( MQTT &_mqtt )
  {
    shouldSaveConfig = false;
    mqtt = &_mqtt;
  }

  bool initFromJsonConfig();
  void setup( bool autoConnect );
  void deleteConfigFile();
  void startAPWithoutConnecting();
  void autoconnectWithOldValues();  // attempt reconnect SSID and password stored in jsonConfig
  bool reconnectsExceeded();
  void resetReconnects();
};

#endif
