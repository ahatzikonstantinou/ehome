#ifndef _value_actuator_h_
#define _value_actuator_h_

#include "value_sensor.h"
#include "device_component.h"

class ValueActuator: public DeviceComponent
{
private:
  ValueSensor* sensor;
public:
  ValueActuator( ValueSensor* sensor );
  void Set( double );
};

#endif
