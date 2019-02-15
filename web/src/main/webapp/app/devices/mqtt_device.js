function Device( mqtt_subscribe_topic, mqtt_publish_topic, cameraId, videostream, state, detection )
{
    this.id = uuidv4();
    // console.log( 'New Device ', this, ' created' );
}

Device.prototype.equals = function( device )
{    
    return this.id == device.id
}

function MqttDevice( mqtt_publish_topic, state, mqtt_subscribe_topic, $scope )
{
    Device.call( this );

    this.mqtt_subscribe_topic = mqtt_subscribe_topic;
    this.mqtt_publish_topic = typeof mqtt_publish_topic !== 'undefined' ? mqtt_publish_topic : null;
    this.state = state;
    this.lastUpdate = null;
    // this.lastUpdate = Date.now(); // TODO: debug only
    this.publisher = null;
    this.scope = $scope;    // $scope is needed for $scope.$apply
    // console.log( this.mqtt_publish_topic, ' this.scope: ', this.scope );
}

MqttDevice.prototype = Object.create( Device.prototype );
MqttDevice.prototype.constructor = MqttDevice;

MqttDevice.prototype.update = function( topic, message )
{
    if( topic == this.mqtt_publish_topic )
    {
        // console.log( 'MqttDevice[' + this.mqtt_publish_topic +']: this message is for me.' );
        this.scope.$apply( this.state = angular.fromJson( message ) );  // without $scope.$apply there is a long delay until the gui of the device is refreshed
        this.lastUpdate = Date.now();
        return true;
    }
    return false;
}

MqttDevice.prototype.setPublisher = function( publisher )
{
    this.publisher = publisher;
}