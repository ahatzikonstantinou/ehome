(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('HouseConfiguration', HouseConfiguration);

    HouseConfiguration.$inject = [];

    function HouseConfiguration() {
        //Constructor
        function HouseConfiguration( server, mqtt_subscribe_topic, state, guiUpdateCb )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state );
            this.server = server;
            this.status = 'NOT_SET'; //'UNAVAILABLE'; //SUCCESS, ERROR
            this.guiUpdateCb = guiUpdateCb;
        }
        
        HouseConfiguration.prototype = Object.create( MqttDevice.prototype );
        HouseConfiguration.prototype.constructor = HouseConfiguration;

        HouseConfiguration.prototype.update = function( topic, message )
        {
            if( topic == this.mqtt_subscribe_topic )
            {
                try
                {
                    var data = angular.fromJson( message );
                    console.log( 'HouseConfiguration data: ',  data );
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

        return HouseConfiguration;
    }
})();
