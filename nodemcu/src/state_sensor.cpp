#include "state_sensor.h"

void StateSensor::Set( String _state )
{
  state = _state;
  UpdateObserver();
}

StateSensor::StateSensor( String name, Device* observer, String _state ) : Sensor( name, observer )
{
  state = _state;
}

String StateSensor::Read()
{
  return String( "\"" ) + name + "\": \"" + state + "\"";
}
