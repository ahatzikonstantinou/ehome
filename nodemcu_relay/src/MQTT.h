#ifndef _mqtt_h
#define  _mqtt_h

#include <PubSubClient.h>
#include "Configuration.h"
#include "WiFiClient.h"

class MQTT
{
private:
  PubSubClient client;
  unsigned int reconnectAttempts;
  Configuration* configuration;

public:
  String device_name;// = "";
  String client_id = "";
  String location = "";
  String server = "";
  String port = "";
  String publish_topic = "";
  String subscribe_topic = "";
  String subscribe_cmd_topic = "";
  String configurator_publish_topic = "";
  String configurator_subscribe_topic = "";

  MQTT( Configuration &_configuration, WiFiClient& espClient ):
    client( espClient )
  {
    configuration = &_configuration;
    reconnectAttempts = 0;
  }

  bool connected();
  bool connect( bool cleanSession = false );
  void disconnect();
  bool reconnectsExceeded();
  void publish( String topic, String message, bool retain );
  void setup( MQTT_CALLBACK_SIGNATURE );
  void setup();
  void loop();
};

#endif
