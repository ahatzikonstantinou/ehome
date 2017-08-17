(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('ServerConnection', ServerConnection);

    ServerConnection.$inject = [];

    function ServerConnection() {
        //Constructor
        function ServerConnection( mqtt_subscribe_topic, state )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state );
        }
        
        ServerConnection.prototype = Object.create( MqttDevice.prototype );
        ServerConnection.prototype.constructor = ServerConnection;

        return ServerConnection;
    }
})();
