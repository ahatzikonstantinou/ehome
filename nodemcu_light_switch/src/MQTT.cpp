#include "MQTT.h"

bool MQTT::reconnect()
{
  static uint32_t lastReconnect = 0;
  uint32_t start = millis();
  if( !client.connected() && ( start - lastReconnect > MIN_MQTT_RECONNECT_MILLIS ) )
  {
    Serial.print( "Client rc=" + String( client.state() ) + ", " );
    Serial.print( "Attempting MQTT connection..." );
    // Attempt to connect
    if( client.connect( client_id.c_str() ) )
    {
      Serial.println( "connected, rc=" + String( client.state() ) );
      // ... and subscribe to topic
      client.subscribe( subscribe_topic.c_str() );
      client.subscribe( configurator_subscribe_topic.c_str() );
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      return false;
    }
  }
  return true;
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
    "\"device_type\": \"" + DEVICE_TYPE + "\"" +
    ", \"device_domain\": \"" + DEVICE_DOMAIN + "\"" +
    ", \"firmware\": \"" + FIRMWARE + "\"" +
    ", \"version\": \"" + VERSION + "\"" +
    ", \"device_name\": \"" + device_name + "\"" +
    ", \"client_id\": \"" + client_id + "\"" +
    ", \"location\": \"" + location + "\"" +
    ", \"publish_topic\": \"" + publish_topic + "\"" +
    ", \"subscribe_topic\": \"" + subscribe_topic + "\"" +
  " }" );
  publish( configurator_publish_topic, msg );
}

void MQTT::publishReport( const int relayState, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold, const CheckAmps c )
{
  String msg(
    String( "{ \"state\": \"" ) + ( relayState == HIGH ? "OFF" : "ON" ) +
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

void MQTT::publishReport( const int relayState, const String trigger, const double offMaxAmpsThreshold, const double onMinAmpsThreshold )
{
  String msg( String( "{ \"state\": \"" ) + ( relayState == HIGH ? "OFF" : "ON" ) + "\", \"trigger\": \"" + trigger + "\", \"offMaxAmpsThreshold\": " + String( offMaxAmpsThreshold ) + ", \"onMinAmpsThreshold\": " + String( onMinAmpsThreshold ) + " }" );
  publish( publish_topic, msg );
}

void MQTT::setup( MQTT_CALLBACK_SIGNATURE )
{
  Serial.println( "Will try to set mqtt server to " + server + " and port to " + port );
  client.setServer( server.c_str(), port.toInt() );
  // Serial.printf( "Will try to set mqtt callback\n" );
  client.setCallback( callback );
}

void MQTT::loop()
{
  client.loop();
}
