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
  uint8 bssid[6];
  int32_t wifiChannel;
  IPAddress gateway;
  IPAddress staticIP;
  IPAddress subnet;
  String SSID = "";
  String password = "";
  void saveConfiguration();
  void updateConfiguration( const WiFiManager& wifiManager );
  unsigned long waitForConnection();

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
  void startAPWithoutConnecting( bool timeout = true );
  bool connect();  // attempt reconnect SSID and password stored in jsonConfig

  String getSSID();
  IPAddress getLocalIP();
};

#endif
