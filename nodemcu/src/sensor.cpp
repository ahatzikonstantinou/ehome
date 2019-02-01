#include "sensor.h"

Sensor::Sensor( String _name, Device* _observer )
{
  name = _name;
  observer = _observer;
}

void Sensor::UpdateObserver()
{
  observer->Update();
}
