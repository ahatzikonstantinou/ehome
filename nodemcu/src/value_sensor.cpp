#include "value_sensor.h"

void ValueSensor::Set( double _value )
{
  value = _value;
  UpdateObserver();
}

ValueSensor::ValueSensor( String name, Device* observer, double _value ): Sensor( name, observer )
{
  value = _value;
}

String ValueSensor::Read()
{
  return String( "\"" ) + name + "\": " + value;
}
