(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('ServerConnection', ServerConnection);

    ServerConnection.$inject = [];

    function ServerConnection() {
        //Constructor
        function ServerConnection( server, mqtt_subscribe_topic, state )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state );
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

        return ServerConnection;
    }
})();
