#ifndef _sensor_h_
#define _sensor_h_

#include <Arduino.h>
#include "mqtt_listener.h"
#include "device.h"
#include "device_component.h"

class Sensor: public MqttListener, public DeviceComponent
{
protected:
  String name;
  Device* observer;
  void UpdateObserver();
public:
  Sensor( String name, Device* observer );
  virtual String Read() = 0;
};

#endif
