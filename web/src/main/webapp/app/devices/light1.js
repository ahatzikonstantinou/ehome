(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Light1', Light1);

    Light1.$inject = [];

    function Light1() {
        //Constructor
        function Light1( mqtt_publish_topic, mqtt_subscribe_topic, state, scope )
        {
            //public properties
           MqttDevice.call( this, mqtt_publish_topic, state, scope, mqtt_subscribe_topic );
        }
        
        Light1.prototype = Object.create( MqttDevice.prototype );
        Light1.prototype.constructor = Light1;

        Light1.prototype.switch = function( value )
        {
            console.log( 'Light1 will send value ', value, ' to topic ', this.mqtt_subscribe_topic );
            if( this.publisher )
            {
                var message = new Paho.MQTT.Message( value == 'ON' ? '1' : '0' );
                message.destinationName = this.mqtt_subscribe_topic ;
                console.log( 'Light1 sending message: ', message );
                this.publisher.send( message );

                // this.state.main = value;//debugging
            }
        }

        return Light1;
    }
})();
