#include "device_updater.h"
// #include "device.h"

DeviceUpdater::DeviceUpdater( Device* dev )
{
  device = dev;
}

void DeviceUpdater::Update()
{
  device->Update();
}
