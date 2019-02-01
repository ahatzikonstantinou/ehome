#ifndef _state_sensor_h_
#define _state_sensor_h_

#include "sensor.h"

class StateSensor: public Sensor
{
private:
  String state;
  void Set( String );
  friend class StateActuator;

public:
  StateSensor( String name, Device* observer, String _state = "" );
  String Read();
};

#endif
