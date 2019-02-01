#ifndef _device_updater_h_
#define _device_updater_h_

#include "device.h"

// class Device;

class DeviceUpdater
{
private:
  Device* device;

public:
  DeviceUpdater( Device* device );
  void Update();
};
#endif
