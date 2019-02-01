#ifndef _state_actuator_h_
#define _state_actuator_h_

#include "state_sensor.h"
#include "device_component.h"

class StateActuator: public DeviceComponent
{
private:
  StateSensor * sensor;
public:
  StateActuator( StateSensor* _sensor );
  void Set( String );
};

#endif
