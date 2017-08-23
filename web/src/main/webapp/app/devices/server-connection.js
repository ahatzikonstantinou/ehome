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
                // console.log( 'data: ',  data );
                this.state = data;
                this.lastUpdate = Date.now();

                this.server.connection.type = data.type;
                this.server.connection.primary = data.primary;
                this.server.connection.connecting = false;
                this.server.connection.connectingProtocol = '';
            }
        }

        ServerConnection.prototype.refresh = function()
        {
            console.log( 'will refresh the connection type' );
            if( this.publisher )
            {
                var message = new Paho.MQTT.Message( "" );
                message.destinationName = this.mqtt_publish_topic ;
                // console.log( 'ServerConnection sending message: ', message, ' with publisher: ', this.publisher );
                this.publisher.send( message );
            }
        }

        ServerConnection.prototype.disconnected = function()
        {
            this.server.connection.type = 'NOT_CONNECTED';
            this.server.connection.connecting = false;
        }

        ServerConnection.prototype.connecting = function( protocol )
        {
            this.server.connection.connecting = true;
            this.server.connection.connectingProtocol = protocol;
        }

        ServerConnection.prototype.connected = function( type )
        {
            this.server.connection.type = type;
            this.server.connection.connecting = false;
        }

        ServerConnection.prototype.setProtocol = function( protocol )
        {
            this.server.connection.protocol = protocol;
        }

        return ServerConnection;
    }
})();
