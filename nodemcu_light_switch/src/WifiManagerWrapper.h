#ifndef _wifimanagerwrapper_h_
#define _wifimanagerwrapper_h_

#include <ArduinoJson.h>
#include "MQTT.h"
#include "Configuration.h"

void saveWifiManagerConfigCallback();

class WifiManagerWrapper
{
private:
  Configuration* configuration;
  MQTT* mqtt;
  bool resetSettings = false;
  bool connectWithOldCredentials = false;
  unsigned int reconnects = 0;
  String SSID = "";
  String password = "";
  void saveConfiguration();

public:
  static bool shouldSaveConfig; //flag for saving data

  WifiManagerWrapper( Configuration &_configuration, MQTT &_mqtt )
  {
    shouldSaveConfig = false;
    mqtt = &_mqtt;
    configuration = &_configuration;
  }

  void initFromConfiguration();
  void setup( bool autoConnect );
  void startAPWithoutConnecting();
  void autoconnectWithOldValues();  // attempt reconnect SSID and password stored in jsonConfig
  bool reconnectsExceeded();
  void resetReconnects();
};

#endif
