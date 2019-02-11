#ifndef _mqtt_h
#define  _mqtt_h

#include <PubSubClient.h>
#include "CheckAmps.h"
#include "Configuration.h"

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
  String configurator_publish_topic = "";
  String configurator_subscribe_topic = "";

  MQTT( Configuration &_configuration, WiFiClient& espClient ):
    client( espClient )
  {
    configuration = &_configuration;
    reconnectAttempts = 0;
  }

  bool reconnect();
  bool reconnectsExceeded();
  void publish( String topic, String message );
  void publishConfiguration();
  void publishReport( const int relayState, const bool relayActive, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold, const CheckAmps c );
  void publishReport( const int relayState, const bool relayActive, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold );
  void setup( MQTT_CALLBACK_SIGNATURE );
  void setup();
  void loop();
};

#endif
