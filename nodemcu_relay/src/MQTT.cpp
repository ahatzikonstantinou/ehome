#include "MQTT.h"
#include "Settings.h"

bool MQTT::connect( bool cleanSession )
{  
  connected_callback( false );

  if( !client.connected() )
  {
    bool success = client.connect(
      client_id.c_str(),  // id
      0, // user
      0, // pass
      configuration->mqtt.publish_topic.c_str(), // last will topic
      0,  // last will QoS
      true, // last will retain
      String( "{ \"id\": \"" + client_id + "\", \"state\": \"offline\" }" ).c_str(),  //last will message
      cleanSession
    );
    if( success )
    {
      Serial.println( "connected, rc=" + String( client.state() ) );
      // ... and subscribe to topic
      subscribe_topic.trim();
      if( !subscribe_topic.isEmpty() )
      {
        client.subscribe( subscribe_topic.c_str(), 1 );
      }
      subscribe_cmd_topic.trim();
      if( !subscribe_cmd_topic.isEmpty() )
      {
        client.subscribe( subscribe_cmd_topic.c_str(), 1 );
      }
      configurator_subscribe_topic.trim();
      if( !configurator_subscribe_topic.isEmpty() )
      {
        client.subscribe( configurator_subscribe_topic.c_str(), 1 );
      }

      // and publish an empty retained message to the last will topic to remove any retained messages
      client.publish( configuration->mqtt.publish_topic.c_str(), "", true );
      Serial.println( "Published a zero length retained message to " + configuration->mqtt.publish_topic + " to clear any previous last will retained messsages" );
    }
    else
    {
     Serial.println( "Mqtt connection failed, rc=" + String( client.state() ) );
     return false;
    }
  }
  connected_callback( true );
  return true;
}

void MQTT::publish( String topic, String message, bool retain )
{
  if( client.connected() )
  {
    connected_callback( true );
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
    client.publish( topic.c_str(), message.c_str(), retain );
  }
  else
  {
    connected_callback( false );
    Serial.println( "Cannot publish because client is not connected." );
  }
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
  subscribe_cmd_topic = configuration->mqtt.subscribe_cmd_topic;
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
  ", \"subscribe_cmd_topic\": \"" + subscribe_cmd_topic + "\"" +
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
  connected_callback( false );
}