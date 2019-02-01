#include "state_actuator.h"

StateActuator::StateActuator( StateSensor* _sensor )
{
  sensor = _sensor;
}

void StateActuator::Set( String state )
{
  sensor->Set( state );
}
