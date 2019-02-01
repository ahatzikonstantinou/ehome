#include "value_actuator.h"

ValueActuator::ValueActuator( ValueSensor* _sensor )
{
  sensor = _sensor;
}

void ValueActuator::Set( double _value )
{
  sensor->Set( _value );
}
