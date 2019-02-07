#ifndef _mqtt_h
#define  _mqtt_h

#include <PubSubClient.h>
#include "CheckAmps.h"

class MQTT
{
private:
  PubSubClient client;

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

  MQTT( WiFiClient& espClient ):
    client( espClient )
  {

  }

  bool reconnect();
  void publish( String topic, String message );
  void publishConfiguration();
  void publishReport( const int relayState, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold, const CheckAmps c );
  void publishReport( const int relayState, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold );
  void setup( MQTT_CALLBACK_SIGNATURE );
  void loop();
};

#endif
