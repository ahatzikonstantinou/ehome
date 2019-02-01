#ifndef _mqtt_listener_h_
#define _mqtt_listener_h_

#include <Arduino.h>


class MqttListener
{
public:
  virtual void Process( String ) = 0;
};

#endif
