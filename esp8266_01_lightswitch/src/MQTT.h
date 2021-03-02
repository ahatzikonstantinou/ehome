#ifndef _mqtt_h
#define  _mqtt_h

#include <PubSubClient.h>
#include "Configuration.h"
#include "WiFiClient.h"


class MQTT
{
private:
  PubSubClient client;
  Configuration* configuration;

public:
  String device_name;// = "";
  String client_id = "";
  String location = "";
  String server = "";
  String port = "";
  String publish_topic = "";
  String subscribe_topic = "";
  String configurator_publish_topic = "";
  String configurator_subscribe_topic = "";

  MQTT( Configuration &_configuration, WiFiClient& espClient ):
    client( espClient )
  {
    configuration = &_configuration;
  }

  bool connect( bool cleanSession = false, bool publishEmptyLastWill = false );
  void publish( String topic, String message, bool retain );
  void publishConfiguration( bool active );
  void publishReport( bool active );
  void setup( MQTT_CALLBACK_SIGNATURE );
  void setup();
  void loop();
  bool connected();
  void disconnect();

};

#endif
