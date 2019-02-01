#include "device.h"
#include "device_updater.h"

const String Device::ReportSubTopic = "/report";
const String Device::AccessPointSubTopic = "/ap";

Device::Device()
{
}

Device::~Device()
{
  for_each( components.begin(), components.end(), []( DeviceComponent* c ){ delete c; } );
}

bool Device::Init()
{

}

void Device::Update()
{
  update = true;
}

void Device::ResetUpdate()
{
  update = false;
}

void Device::AddMqttListener( MqttListener* listener )
{
  mqttListeners.push_back( listener );
}

void Device::AddDeviceComponent( DeviceComponent* component )
{
  components.push_back( component );
}

void Device::AddSensor( Sensor* sensor )
{
  sensors.push_back( sensor );
}

void Device::Process( String mqttMessage )
{
  for_each( mqttListeners.begin(), mqttListeners.end(), [mqttMessage]( MqttListener* l ){ l->Process( mqttMessage ); } );
}
