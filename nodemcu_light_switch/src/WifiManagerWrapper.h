#ifndef _wifimanagerwrapper_h_
#define _wifimanagerwrapper_h_

#include "MQTT.h"

void saveWifiManagerConfigCallback();

class WifiManagerWrapper
{
private:
  MQTT* mqtt;
  const String configFileName = "/config.json";
public:
  static bool shouldSaveConfig; //flag for saving data

  WifiManagerWrapper( MQTT &_mqtt )
  {
    shouldSaveConfig = false;
    mqtt = &_mqtt;
  }

  void setup( bool autoConnect );
  void deleteConfigFile();
  void startAPWithoutConnecting();
};

#endif
