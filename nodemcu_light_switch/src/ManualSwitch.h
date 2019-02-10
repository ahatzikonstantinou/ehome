#ifndef _manual_switch_h_
#define _manual_switch_h_

#include "Relay.h"
#include "MQTT.h"

#if defined(ESP8266) || defined(ESP32)
#include <functional>
#define SINGLETRIGGER_CALLBACK_SIGNATURE std::function<void( Relay* )> single_trigger_callback
#define DOUBLETRIGGER_CALLBACK_SIGNATURE std::function<void( Relay* )> double_trigger_callback
#else
#define SINGLETRIGGER_CALLBACK_SIGNATURE void (*single_trigger_callback)( Relay* )
#define DOUBLETRIGGER_CALLBACK_SIGNATURE void (*double_trigger_callback)( Relay* )
#endif

class ManualSwitch
{
private:
  Relay* relay;
  MQTT* mqtt;
  SINGLETRIGGER_CALLBACK_SIGNATURE;
  DOUBLETRIGGER_CALLBACK_SIGNATURE;

public:
  uint32_t last_trigger;
  ManualSwitch( Relay& _relay, MQTT &_mqtt, SINGLETRIGGER_CALLBACK_SIGNATURE,  DOUBLETRIGGER_CALLBACK_SIGNATURE );
  void setup();
  void loop( bool firstRun ); //in the first run save the amps but do not process triggers
};

#endif
