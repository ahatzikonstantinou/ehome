#ifndef _mqtt_h
#define  _mqtt_h

#include <PubSubClient.h>
#include "Configuration.h"
#include "WiFiClient.h"

// ahat: the connected_callback function will be called when mqtt so that a buzzer or a led
// can signal that mqtt is connected.
#if defined(ESP8266) || defined(ESP32)
#include <functional>
#define CONNECTED_CALLBACK_SIGNATURE std::function<void( bool connected )> connected_callback
#else
#define CONNECTED_CALLBACK_SIGNATURE void (*connected_callback)( bool connected )
#endif

class MQTT
{
private:
  PubSubClient client;
  unsigned int reconnectAttempts;
  Configuration* configuration;
  CONNECTED_CALLBACK_SIGNATURE;

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

  MQTT( Configuration &_configuration, WiFiClient& espClient, CONNECTED_CALLBACK_SIGNATURE ):
    client( espClient )
  {
    configuration = &_configuration;
    reconnectAttempts = 0;
    this->connected_callback = connected_callback;
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
