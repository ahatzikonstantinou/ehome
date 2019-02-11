#ifndef _wifimanagerwrapper_h_
#define _wifimanagerwrapper_h_

#include <ArduinoJson.h>
#include <WiFiManager.h>  //https://github.com/tzapu/WiFiManagerportal_idle_callback
#include "MQTT.h"
#include "Configuration.h"

void saveWifiManagerConfigCallback();

class WifiManagerWrapper
{
private:
  Configuration* configuration;
  MQTT* mqtt;
  PORTAL_IDLE_CALLBACK_SIGNATURE;
  bool resetSettings = false;
  bool connectWithOldCredentials = false;
  unsigned int reconnects = 0;
  String SSID = "";
  String password = "";
  void saveConfiguration();

public:
  static bool shouldSaveConfig; //flag for saving data

  WifiManagerWrapper( Configuration &_configuration, MQTT &_mqtt, PORTAL_IDLE_CALLBACK_SIGNATURE )
  {
    shouldSaveConfig = false;
    mqtt = &_mqtt;
    configuration = &_configuration;
    this->portal_idle_callback = portal_idle_callback;
  }

  void initFromConfiguration();
  void setup( bool autoConnect, bool timeout = true );
  void startAPWithoutConnecting( bool timeout = true );
  void autoconnectWithOldValues();  // attempt reconnect SSID and password stored in jsonConfig
  bool reconnectsExceeded();
  void resetReconnects();
};

#endif
