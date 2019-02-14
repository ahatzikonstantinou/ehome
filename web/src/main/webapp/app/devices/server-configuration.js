(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('ServerConfiguration', ServerConfiguration);

    ServerConfiguration.$inject = [];

    function ServerConfiguration() {
        //Constructor
        function ServerConfiguration( server, mqtt_subscribe_topic, state, guiUpdateCb, scope )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state, scope );
            this.server = server;
            this.status = 'NOT_SET'; //'UNAVAILABLE'; //SUCCESS, ERROR
            this.guiUpdateCb = guiUpdateCb;
        }
        
        ServerConfiguration.prototype = Object.create( MqttDevice.prototype );
        ServerConfiguration.prototype.constructor = ServerConfiguration;

        ServerConfiguration.prototype.update = function( topic, message )
        {
            if( topic == this.mqtt_subscribe_topic )
            {
                try
                {
                    var data = angular.fromJson( message );
                    console.log( 'ServerConfiguration data: ',  data );
                    this.state = data;
                    this.lastUpdate = Date.now();
                    if( typeof data.main !== 'undefined' )
                    {
                        this.status = data.main;
                    }
                    else
                    {
                        this.guiUpdateCb( this.server, data );
                        this.status = 'SUCCESS';
                    }                    
                }
                catch( error )
                {
                    this.status = 'ERROR';
                    console.log( error );
                }
            }
        }

        return ServerConfiguration;
    }
})();
