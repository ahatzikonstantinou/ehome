(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('ServerConnection', ServerConnection);

    ServerConnection.$inject = [];

    function ServerConnection() {
        //Constructor
        function ServerConnection( server, mqtt_publish_topic, mqtt_subscribe_topic, state, scope )
        {
            MqttDevice.call( this, mqtt_publish_topic, state, scope, mqtt_subscribe_topic );
            this.server = server;
        }
        
        ServerConnection.prototype = Object.create( MqttDevice.prototype );
        ServerConnection.prototype.constructor = ServerConnection;

        ServerConnection.prototype.update = function( topic, message )
        {
            if( topic == this.mqtt_subscribe_topic )
            {
                try
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
                catch( error )
                {
                    console.error( error );
                }
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
            // console.log( 'this.scope.$$phase : ', this.scope.$$phase );
            // console.log( 'this.scope.$root.$$phase : ', this.scope.$root.$$phase );
            // if( !this.scope.$$phase && !this.scope.$root.$$phase )
            // {
            //     this.scope.$apply( function() {
            //         this.server.connection.type = 'NOT_CONNECTED';
            //         this.server.connection.connecting = false;
            //     });
            // }
            // else
            // {
                this.server.connection.type = 'NOT_CONNECTED';
                this.server.connection.connecting = false;
            // }
        }

        ServerConnection.prototype.connecting = function( protocol )
        {
            // if( !this.scope.$$phase && !this.scope.$root.$$phase )
            // {
            //     this.scope.$apply( function() {
            //         this.server.connection.connecting = true;
            //         this.server.connection.connectingProtocol = protocol;
            //     });
            // }
            // else
            // {
                this.server.connection.connecting = true;
                this.server.connection.connectingProtocol = protocol;
            // }
        }

        ServerConnection.prototype.connected = function( type )
        {
            // if( !this.scope.$$phase && !this.scope.$root.$$phase )
            // {
            //     this.scope.$apply( function() {
            //         this.server.connection.type = type;
            //         this.server.connection.connecting = false;
            //     });
            // }
            // else
            // {
                this.server.connection.type = type;
                this.server.connection.connecting = false;
            // }
        }

        ServerConnection.prototype.setProtocol = function( protocol )
        {
            // if( !this.scope.$$phase && !this.scope.$root.$$phase )
            // {
            //     this.scope.$apply( function() {
            //         this.server.connection.protocol = protocol;
            //     });
            // }
            // else
            // {
                this.server.connection.protocol = protocol;
            // }
        }

        return ServerConnection;
    }
})();
