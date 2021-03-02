#include "MQTT.h"
#include "Settings.h"


bool MQTT::connect( bool cleanSession, bool publishEmptyLastWill )
{
  bool success = client.connect(
      client_id.c_str(),  // id
      0, // user
      0, // pass
      0, // last will topic
      0,  // last will QoS
      false, // last will retain
      0,  //last will message
      cleanSession // cleanSession
    );
  // bool success = client.connect(
    //   client_id.c_str(),  // id
    //   configuration->mqtt.publish_topic.c_str(), // last will topic
    //   0,  // last will QoS
    //   true, // last will retain
    //   String( "{ \"id\": \"" + client_id + "\", \"state\": \"offline\" }" ).c_str()  //last will message
    // );
  if( success )
  {
    Serial.println( "connected, rc=" + String( client.state() ) );
    // ... and subscribe to topic
    client.subscribe( subscribe_topic.c_str(), 1 );
    // delay( 1000 );
    // yield();
    // client.subscribe( configurator_subscribe_topic.c_str() );

    if( publishEmptyLastWill )
    {
      // and publish an empty retained message to the last will topic to remove any retained messages
      client.publish( configuration->mqtt.publish_topic.c_str(), "", true );
      Serial.println( "Published a zero length retained message to " + configuration->mqtt.publish_topic + " to clear any previous last will retained messsages" );
    }
  }
  else
  {
    Serial.println( "Mqtt connection failed, rc=" + String( client.state() ) );
  }
  return success;
}

void MQTT::publish( String topic, String message, bool retain )
{
    if( client.connected() )
    {
      Serial.print( "Publishing: " + String( topic ) );
      Serial.println( message );
      // // Serial.println( "sizeof message: " + String( sizeof( message ) ) );
      //
      // char _msg[ message.length() + 1 ];  // note: sizeof( message ) will give the wrong size, use message.length() instead
      // memset(&_msg[0], 0, sizeof(_msg));
      // message.toCharArray( _msg, sizeof( _msg ) ) ;
      // // Serial.println( _msg );
      //
      // client.publish( topic, _msg );
      bool success = client.publish( topic.c_str(), message.c_str(), retain );
      Serial.println( "Publish " + String( success ? "succeeded" : "failed" ) + "." );
    }
    else
    {
      Serial.println( "Cannot publish because client is not connected." );
    }
}

void MQTT::publishConfiguration( bool active )
{
  String msg(
    String( "{ " ) +
    "\"cmd\": \"ITEM_UPDATE\"" +
    ", \"data\": { " +
    "\"type\": \"" + DEVICE_TYPE + "\"" +
    ", \"domain\": \"" + DEVICE_DOMAIN + "\"" +
    ", \"firmware\": \"" + FIRMWARE + "\"" +
    ", \"version\": \"" + VERSION + "\"" +
    ", \"protocol\": \"mqtt\"" +
    ", \"name\": \"" + device_name + "\"" +
    ", \"id\": \"" + client_id + "\"" +
    ", \"location\": \"" + location + "\"" +
    ", \"publish\": \"" + publish_topic + "\"" +
    ", \"subscribe\": \"" + subscribe_topic + "\"" +
    ", \"ip\": \"" + WiFi.localIP().toString() + "\"" +
    ", \"SSID\": \"" + WiFi.SSID() + "\"" +
    ", \"BSSID\": \"" + WiFi.BSSIDstr() + "\"" +
    ", \"wifi channel\": \"" + WiFi.channel() + "\"" +
    ", \"wifi RSSI\": \"" + WiFi.RSSI() + "\"" +
    ", \"VCC\": \"" + ESP.getVcc() + "\"" +
    ", \"active\": \"" + String( active ) + "\"" +
    
  " } }" );
  publish( configurator_publish_topic, msg, false );
}

  void MQTT::publishReport( bool active )
  {
    String msg(
    String( "{ " ) +
    "\"msg\": \"EVENT\"" +
    ", \"data\": { " +
    "\"type\": \"" + DEVICE_TYPE + "\"" +
    ", \"domain\": \"" + DEVICE_DOMAIN + "\"" +
    ", \"firmware\": \"" + FIRMWARE + "\"" +
    ", \"version\": \"" + VERSION + "\"" +
    ", \"protocol\": \"mqtt\"" +
    ", \"name\": \"" + device_name + "\"" +
    ", \"id\": \"" + client_id + "\"" +
    ", \"location\": \"" + location + "\"" +
    ", \"publish\": \"" + publish_topic + "\"" +
    ", \"subscribe\": \"" + subscribe_topic + "\"" +
    ", \"ip\": \"" + WiFi.localIP().toString() + "\"" +
    ", \"wifi RSSI\": \"" + WiFi.RSSI() + "\"" +
    ", \"VCC\": \"" + ESP.getVcc() + "\"" +    
  " } }" );
    publish( publish_topic, msg, true );
  }


void MQTT::setup( MQTT_CALLBACK_SIGNATURE )
{
  setup();
  // Serial.printf( "Will try to set mqtt callback\n" );
  client.setCallback( callback );
}

void MQTT::setup()
{
  if( client.connected() )
  {
      client.disconnect();  // if connected, disconnect in order to cancel old subscriptions and subscribe to new topics
  }

  device_name = configuration->mqtt.device_name;
  client_id = configuration->mqtt.client_id;
  location = configuration->mqtt.location;
  server = configuration->mqtt.server;
  port = configuration->mqtt.port;
  publish_topic = configuration->mqtt.publish_topic;
  subscribe_topic = configuration->mqtt.subscribe_topic;
  configurator_publish_topic = configuration->mqtt.configurator_publish_topic;
  configurator_subscribe_topic = configuration->mqtt.configurator_subscribe_topic;

  Serial.println( String( "MQTT setup: " ) +
  "\"device_name\": \"" + device_name + "\"" +
  ", \"id\": \"" + client_id + "\"" +
  ", \"location\": \"" + location + "\"" +
  ", \"server\": \"" + server + "\"" +
  ", \"port\": \"" + port + "\"" +
  ", \"publish\": \"" + publish_topic + "\"" +
  ", \"subscribe\": \"" + subscribe_topic + "\"" +
  ", \"configurator_publish_topic\": \"" + configurator_publish_topic + "\"" +
  ", \"configurator_subscribe_topic\": \"" + configurator_subscribe_topic + "\""
);

  Serial.println( "Will try to set mqtt server to " + server + " and port to " + port );
  client.setServer( server.c_str(), port.toInt() );
}

void MQTT::loop()
{
  client.loop();
}

bool MQTT::connected()
{
  return client.connected();
}

void MQTT::disconnect()
{
  if( client.connected() )
  {
    client.disconnect();
  }
}
