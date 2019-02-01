#ifndef _device_h_
#define _device_h_

#include <Arduino.h>
#include "mqtt_listener.h"
// #include "sensor.h"
#include <vector>
#include <memory> // std::auto_ptr
#include <algorithm> // std::for_each
#include "device_component.h"
using namespace std;

// class DeviceUpdater;  // forward declaration to avoid circular include
class Sensor;  // forward declaration to avoid circular include

class Device
{
private:
  static const String AccessPointSubTopic;
  static const String ReportSubTopic;

  String SubscribeTopic;
  String PublishTopic;
  vector<MqttListener*> mqttListeners;
  vector<DeviceComponent*> components;
  vector<Sensor*> sensors;
  bool update;
  void Process( String mqttMessage );

public:
  Device();
  ~Device();
  bool Init();
  void Update();
  void ResetUpdate();
  void AddMqttListener( MqttListener* listener );
  void AddDeviceComponent( DeviceComponent* component );
  void AddSensor( Sensor* sensor );
};

#endif
