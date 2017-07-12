function MqttDevice( mqtt_subscribe_topic, state, mqtt_publish_topic )
{
    this.mqtt_subscribe_topic = mqtt_subscribe_topic;
    this.mqtt_publish_topic = typeof mqtt_publish_topic !== 'undefined' ? mqtt_publish_topic : null;
    this.state = state;
    this.lastUpdate = null; //Date.now();
    this.publisher = null;
}

MqttDevice.prototype.update = function( topic, message )
{
    if( topic == this.mqtt_subscribe_topic )
    {
        console.log( 'MqttDevice[' + this.mqtt_subscribe_topic +']: this message is for me.' );
        this.state = angular.fromJson( message );
        this.lastUpdate = Date.now();
    }
}

MqttDevice.prototype.setPublisher = function( publisher )
{
    this.publisher = publisher;
}