(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Light1', Light1);

    Light1.$inject = [];

    function Light1() {
        //Constructor
        function Light1( mqtt_subscribe_topic, mqtt_publish_topic, state )
        {
            //public properties
           MqttDevice.call( this, mqtt_subscribe_topic, state, mqtt_publish_topic );
        }
        
        Light1.prototype = Object.create( MqttDevice.prototype );
        Light1.prototype.constructor = Light1;

        Light1.prototype.switch = function( value )
        {
            console.log( 'Light1 will send value ', value, ' to topic ', this.mqtt_publish_topic );
            if( this.publisher )
            {
                var message = new Paho.MQTT.Message( value );
                message.destinationName = this.mqtt_publish_topic ;
                console.log( 'Light1 sending message: ', message );
                this.publisher.send( message );

                // this.state.main = value;//debugging
            }
        }

        return Light1;
    }
})();
