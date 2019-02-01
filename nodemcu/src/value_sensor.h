#ifndef _value_sensor_h_
#define _value_sensor_h_

#include "sensor.h"

class ValueSensor: public Sensor
{
private:
  double value;
  void Set( double value );
  friend class ValueActuator;

public:
  ValueSensor( String name, Device* observer, double _value = 0.0 );
  String Read();
};
#endif
