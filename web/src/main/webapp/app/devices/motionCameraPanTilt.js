(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('MotionCameraPanTilt', MotionCameraPanTilt);

    MotionCameraPanTilt.$inject = [ '$http' ];

    function MotionCameraPanTilt( $http ) {
        //Constructor
        function MotionCameraPanTilt( mqtt_subscribe_topic, mqtt_publish_topic, cameraId, videostream, state, detection )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state, mqtt_publish_topic );

            //public properties
            this.cameraId = cameraId
            this.videostream = videostream; 
            this.detection = detection;
            this.lastDetection = Date.now();
        }

        MotionCameraPanTilt.prototype = Object.create( MqttDevice.prototype );
        MotionCameraPanTilt.prototype.constructor = MotionCameraPanTilt;

        MotionCameraPanTilt.prototype._cmd = function( value )
        { 
            if( this.publisher )
            { 
                var m = new Paho.MQTT.Message( '{"cmd":"' + value +'", "camera":"' + this.cameraId + '"}' ); 
                m.destinationName = this.mqtt_publish_topic; 
                this.publisher.send( m ); 
            } 
        }

        MotionCameraPanTilt.prototype.up = function(){ this._cmd( 'up' ); }
        MotionCameraPanTilt.prototype.down = function(){ this._cmd( 'down' ); }
        MotionCameraPanTilt.prototype.left = function(){ this._cmd( 'left' ); }
        MotionCameraPanTilt.prototype.right = function(){ this._cmd( 'right' ); }
        MotionCameraPanTilt.prototype.stop = function(){ this._cmd( 'stop' ); }
        MotionCameraPanTilt.prototype.startDetection = function(){ this._cmd( 'startDetection' ); }
        MotionCameraPanTilt.prototype.pauseDetection = function(){ this._cmd( 'pauseDetection' ); }
        MotionCameraPanTilt.prototype.getState = function(){ this._cmd( 'getState' ); }

        MotionCameraPanTilt.prototype.update = function( topic, message )
        {
            if( topic == this.mqtt_subscribe_topic )
            {
                var data = angular.fromJson( message );
                // console.log( 'motion-data:',  data );
                if( data.camera == this.cameraId )
                {
                    // console.log( 'MotionCameraPanTilt[' + this.mqtt_subscribe_topic +']: this message is for me.' );
                    if( data.state )
                    {                        
                        this.state = data.state;           
                        this.lastUpdate = Date.now();             
                    }
                    else if( data.detection )
                    {
                        this.detection = data.detection;
                        this.lastDetection = Date.now();
                    }
                }
            }
        }

        return MotionCameraPanTilt;
    }
})();

