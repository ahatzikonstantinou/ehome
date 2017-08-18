(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('ServerConnection', ServerConnection);

    ServerConnection.$inject = [];

    function ServerConnection() {
        //Constructor
        function ServerConnection( server, mqtt_subscribe_topic, mqtt_publish_topic, state )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state, mqtt_publish_topic );
            this.server = server;
        }
        
        ServerConnection.prototype = Object.create( MqttDevice.prototype );
        ServerConnection.prototype.constructor = ServerConnection;

        ServerConnection.prototype.update = function( topic, message )
        {
            if( topic == this.mqtt_subscribe_topic )
            {
                var data = angular.fromJson( message );
                console.log( 'data: ',  data );
                this.state = data;
                this.lastUpdate = Date.now();

                this.server.connection.type = data.type;
                this.server.connection.primary = data.primary;
            }
        }

        ServerConnection.prototype.refresh = function()
        {
            console.log( 'will refresh the connection type' );
            if( this.publisher )
            {
                var message = new Paho.MQTT.Message( "" );
                message.destinationName = this.mqtt_publish_topic ;
                console.log( 'ServerConnection sending message: ', message );
                this.publisher.send( message );
            }
        }

        return ServerConnection;
    }
})();
