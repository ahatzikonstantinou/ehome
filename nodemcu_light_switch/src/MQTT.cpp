#include "MQTT.h"
#include "Buzzer.h"

bool MQTT::reconnect()
{
  static uint32_t lastReconnect = 0;
  uint32_t start = millis();
  if( !client.connected() && ( start - lastReconnect > MIN_MQTT_RECONNECT_MILLIS ) )
  {
    lastReconnect = start;
    reconnectAttempts++;
    Serial.print( "Client rc=" + String( client.state() ) + ", " );
    Serial.print( "Attempting MQTT connection..." );
    // Attempt to connect
    bool success = client.connect(
      client_id.c_str(),  // id
      configuration->mqtt.publish_topic.c_str(), // last will topic
      0,  // last will QoS
      true, // last will retain
      String( "{ \"id\": \"" + client_id + "\", \"state\": \"offline\" }" ).c_str()  //last will message
    );
    if( success )
    {
      Buzzer::playMQTTConnected();
      Serial.println( "connected, rc=" + String( client.state() ) );
      reconnectAttempts = 0;
      // ... and subscribe to topic
      client.subscribe( subscribe_topic.c_str() );
      client.subscribe( configurator_subscribe_topic.c_str() );

      // and publish an empty retained message to the last will topic to remove any retained messages
      client.publish( configuration->mqtt.publish_topic.c_str(), "", true );
      Serial.println( "Published a zero length retained message to " + configuration->mqtt.publish_topic + " to clear any previous last will retained messsages" );
    }
    else
    {
      Buzzer::playMQTTDisconnected();
      Serial.print( "failed, rc=" );
      Serial.print( client.state() );
      Serial.println( " try again in " + String( MIN_MQTT_RECONNECT_MILLIS / 1000 ) + "  seconds" );
      return false;
    }
  }
  return true;
}

bool MQTT::reconnectsExceeded()
{
  return reconnectAttempts > MAX_MQTT_RECONNECT_ATTEMPTS;
}

void MQTT::publish( String topic, String message )
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
      client.publish( topic.c_str(), message.c_str() );
    }
    else
    {
      Serial.println( "Cannot publish because client is not connected." );
    }
}

void MQTT::publishConfiguration()
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
  " } }" );
  publish( configurator_publish_topic, msg );
}

void MQTT::publishReport( const int relayState, const bool relayActive, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold, const CheckAmps c )
{
  String msg(
    String( "{ \"id\": \"" + client_id +
    "\", \"state\": \"" ) + ( relayState == HIGH ? "OFF" : "ON" ) +
    "\", \"active\": \"" + ( relayActive ? "true" : "false" ) +
    "\", \"trigger\": \"" + trigger +
    "\", \"offMaxAmpsThreshold\": " + String( offMaxAmpsThreshold ) +
    ", \"onMinAmpsThreshold\": " + String( onMinAmpsThreshold ) +
    ", \"offAmps\": " + String( c.offAmps ) +
    ", \"offError\": " + ( c.offError ? "true" : "false" ) +
    ", \"onAmps\": " + String( c.onAmps ) +
    ", \"onError\": " + ( c.onError ? "true" : "false" ) +
  " }" );
  publish( publish_topic, msg );
}

void MQTT::publishReport( const int relayState, const bool relayActive, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold )
{
  String msg(
    String( "{ \"id\": \"" + client_id +
    "\", \"state\": \"" ) + ( relayState == HIGH ? "OFF" : "ON" ) +
    "\", \"active\": \"" + ( relayActive ? "true" : "false" ) +
    "\", \"trigger\": \"" + trigger +
    "\", \"offMaxAmpsThreshold\": " + String( offMaxAmpsThreshold ) +
    ", \"onMinAmpsThreshold\": " + String( onMinAmpsThreshold ) +
  " }" );
  publish( publish_topic, msg );
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
