function Device( mqtt_subscribe_topic, mqtt_publish_topic, cameraId, videostream, state, detection )
{
    this.id = uuidv4();
    // console.log( 'New Device ', this, ' created' );
}

Device.prototype.equals = function( device )
{    
    return this.id == device.id
}

function MqttDevice( mqtt_publish_topic, state, $scope, mqtt_subscribe_topic )
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
    this.mqtt_message = ""; //store the incoming raw mqtt messages as strings for debugging
}

MqttDevice.prototype = Object.create( Device.prototype );
MqttDevice.prototype.constructor = MqttDevice;

MqttDevice.prototype.update = function( topic, message )
{
    if( topic == this.mqtt_publish_topic )
    {
        // console.log( 'MqttDevice[' + this.mqtt_publish_topic +']: this message is for me.' );
        try
        {            
            // without $scope.$apply there is a long delay until the gui of the device is refreshed
            this.scope.$apply( this.state = angular.fromJson( message ) );  
            this.scope.$apply( this.lastUpdate = Date.now() );
            this.scope.$apply( this.mqtt_message = message );
            return true;
        }
        catch( error )
        {
            console.error( error );
            return false;
        }
    }
    return false;
}

MqttDevice.prototype.setPublisher = function( publisher )
{
    this.publisher = publisher;
}