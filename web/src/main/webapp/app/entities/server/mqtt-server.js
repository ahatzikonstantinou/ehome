(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('MqttServer', MqttServer);

    MqttServer.$inject = [ '$interval', 'MqttClient' ];

    function MqttServer( $interval, MqttClient ) {

        return {
            init: init
        };

        function init( server, updateConfiguration, removeConf, removeHouses, baseInit )
        {
            if( server.failover )
            {
                console.log( 'Initialising failover of server ', server.name );
                baseInit( server.failover, updateConfiguration, removeConf, removeHouses, true, server, server.connectionDevice, server.configurationDevice );
                // switch( server.failover.type )
                // {
                //     case 'xmpp':                    
                //         initXmppServer( server.failover, true );
                //         console.log( 'Failover of server ', server.name, ': ', server.failover );
                //         break;
                //     default:
                //         console.log( 'Unsupported failover server type [', server.failover.type, ']: ', server.failover );
                // }
            }

            server.client = MqttClient;
            var client = server.client;            
            // server.observerDevices = [];

            client.init( server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port, server.settings.mqtt_client_id );

            server.unsubscribeConf = function()
            {
                this.baseUnsubscribeConf( this.conf );
                if( this.failover )
                {
                    this.failover.unsubscribeConf();
                }
            }

            server.unsubscribeHouses = function()
            {
                // unsubscribeHouses( this, this.houses );
                this.baseUnsubscribeHouses( this.houses );
                if( this.failover )
                {
                    this.failover.unsubscribeHouses();
                }
            }

            server.removeConf = function()
            {
                removeConf( this.conf );
                if( this.failover )
                {
                    removeConf( this.failover.conf );
                }
            }

            server.removeHouses = function()
            {
                removeHouses( this.houses );
                if( this.failover )
                {
                    removeHouses( this.failover.houses );
                }
            }

            // messages subscribed by this function should be handled directly in the client.onMessageArrived function
            server.subscribe = function( topic )
            {
                console.log( 'my mqtt server subscribe for topic ', topic );
                if( this.connectionStatus == 'CONNECTED')
                {
                    this.client.subscribe( topic );
                }
                if( this.failover )
                {
                    this.failover.subscribe( topic );
                }
            }

            server.subscribeDevice = function( device, topic )
            {
                console.log( 'my mqtt server subscribe for device topic ', topic );
                if( server.connectionStatus == 'CONNECTED')
                {
                    this.client.subscribe( topic );
                    this.observerDevices.push( device );
                }
                if( this.failover )
                {
                    this.failover.subscribeDevice( device, topic );
                }
            }

            server.unsubscribe = function( topic )
            {
                // console.log( 'my mqtt unsubscribe for topic ', topic );
                if( server.connectionStatus == 'CONNECTED')
                {
                    this.client.unsubscribe( topic );
                }
                if( server.failover )
                {
                    server.failover.unsubscribe( topic );
                }
            }

            server.unsubscribeDevice = function( device, topic )
            {
                // console.log( 'unsubscribeDevice for server: ', this.type, ' connectionStatus: ', this.connectionStatus );
                if( this.connectionStatus == 'CONNECTED')
                {
                    this.client.unsubscribe( topic );
                    for( var i = 0 ; i < this.observerDevices.length; i++ )
                    {
                        if( this.observerDevices[i] === device )
                        {
                            // console.log( 'removing observer device ', this.observerDevices[i], ' from server: ', this.type );                            
                            this.observerDevices.splice( i, 1 );
                            break;
                        }
                    }
                }
                if( server.failover )
                {
                    server.failover.unsubscribeDevice( device, topic );
                }
            }

            server.send = function( message )
            {
                console.log( 'mqtt server will send "', message, '", server: ', this );
                if( this.failover && this.failover.active )
                {
                    this.failover.send( message );
                    return;
                }

                // else
                if( server.connectionStatus == 'CONNECTED')
                {
                    this.client.send( message );
                }
            }

            server.initialSubscriptions = function()
            {
                console.log( 'Subscribing to connection topic...', server.connectionDevice.mqtt_subscribe_topic );
                server.subscribe( server.connectionDevice.mqtt_subscribe_topic );

                console.log( 'Subscribing to configuration topic...', server.settings.configuration.subscribeTopic );
                server.subscribe( server.settings.configuration.subscribeTopic );
                
                console.log( 'Will publish to get server connection...', server.settings.connection.publishTopic );
                var message = new Paho.MQTT.Message( "no_data" );
                message.destinationName = server.connectionDevice.mqtt_publish_topic ;
                server.send( message );

                console.log( 'Will publish to publishTopic to get house-configuration...', server.settings.configuration.publishTopic );
                message = new Paho.MQTT.Message( server.settings.configuration.publishMessage );
                message.destinationName = server.settings.configuration.publishTopic ;
                server.send( message );
            }

            client.connect({
                onSuccess: initialSuccessCallback,
                onFailure: function() { 
                    console.log( 'Failed to connect to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port, ' attempting to reconnect.' );
                    server.connectionStatus = 'DISCONNECTED';
                    // $scope.$apply( server.connectionDevice.disconnected() );
                    server.connectionDevice.disconnected();

                    if( server.failover )
                    {
                        console.log( 'Activating failover until mqtt reconnects, failover: ', server.failover );                    
                        server.failover.activate( true );
                        // $scope.$apply( server.connectionDevice.setProtocol( server.failover.type ) );
                        server.connectionDevice.setProtocol( server.failover.type );

                        server.initialSubscriptions();
    
                        console.log( 'Will publish to refresh server connection...', server.settings.connection.publishTopic );
                        var message = new Paho.MQTT.Message( "no_data" );
                        message.destinationName = server.connectionDevice.mqtt_publish_topic ;
                        server.send( message );
                    }
                },
                invocationContext: server,
                keepAliveInterval: server.settings.connection.keepAliveInterval,
                timeout: server.settings.connection.timeout
            });
            server.connectionStatus = 'CONNECTING';
            server.connectionDevice.connecting( server.type );

            $interval( function() {
                    // console.log( '$interval client connected: ', client._client.connected, ', socket: ', client._client.socket );
                    // console.log( '$interval _client: ', client._client );
                    console.log( '$interval server.connectionStatus: ', server.connectionStatus );
                    if( server.connectionStatus == 'DISCONNECTED' )
                    {
                        console.log( 'Mqtt client still not connected. Attempting reconnection' );
                        server.connectionStatus = 'CONNECTING';
                        server.connectionDevice.connecting( server.type );
                        client.connect({
                            onSuccess: successCallback,
                            onFailure: function() { 
                                console.log( 'Failed to connect to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port, ' attempting to reconnect.' );
                                server.connectionStatus = 'DISCONNECTED';
                                if( !server.failover )
                                {
                                    // $scope.$apply( server.connectionDevice.disconnected() );
                                    server.connectionDevice.disconnected()
                                }

                                if( server.failover && !server.failover.active )
                                {
                                    console.log( 'Activating failover until mqtt reconnects, failover: ', server.failover );                    
                                    server.failover.activate( true );
                                    // $scope.$apply( server.connectionDevice.setProtocol( server.failover.type ) );
                                    server.connectionDevice.setProtocol( server.failover.type );

                                    console.log( 'Will publish to refresh server connection...', server.settings.connection.publishTopic );
                                    var message = new Paho.MQTT.Message( "no_data" );
                                    message.destinationName = server.connectionDevice.mqtt_publish_topic ;
                                    server.send( message );
                                }
                            },
                            invocationContext: server,
                            keepAliveInterval: server.settings.connection.keepAliveInterval,
                            timeout: server.settings.connection.timeout
                        });
                    }
                }, 30000, 0, true, client 
            );
            
            $interval( function() {
                    if( server.connectionStatus == 'CONNECTED' && server.configurationDevice.status != 'SUCCESS' )
                    {
                        console.log( 'Mqtt server still gets house configuration ', server.configurationDevice.status, ', republishing to get configuration' );
                        var message = new Paho.MQTT.Message( server.settings.configuration.publishMessage );
                        message.destinationName = server.settings.configuration.publishTopic ;
                        server.send( message );
                    }
                }, 10000, 0, true, client 
            );

            client._client.onMessageArrived = function( message )
            {
                var server = this.connectOptions.invocationContext;
                // console.log( server );
                console.log( 'Received mqtt message: [', message.destinationName.trim(), '] "', message.payloadString, '"' );
                // if( message.destinationName == server.settings.configuration.subscribeTopic )
                // {
                //     var payload = angular.fromJson( message.payloadString );
                //     if( !payload.main )
                //     {
                //         updateConfiguration( server, message.payloadString );
                //     }
                // }

                server.updateLast();

                // if this is not a new houses-configuration message then it must be a message for the subscribed devices of the current house configuration
                for( var i = 0 ; i < server.observerDevices.length ; i++ )
                {
                    // console.log( server.observerDevices[i] );
                    // $scope.$apply( function() { server.observerDevices[i].update( message.destinationName, message.payloadString ); } );
                    server.observerDevices[i].update( message.destinationName, message.payloadString );
                }
            }

            client._client.onConnectionLost = function( error ) { 
                console.log( 'Connection lost with error: ', error );
                server.connectionStatus = 'DISCONNECTED';
                // $scope.$apply( server.connectionDevice.disconnected() );
                server.connectionDevice.disconnected();

                if( server.failover && !server.failover.active )
                {
                    console.log( 'Activating failover until mqtt reconnects, failover: ', server.failover );                    
                    server.failover.activate( true );
                    // $scope.$apply( server.connectionDevice.setProtocol( server.failover.type ) );
                    server.connectionDevice.setProtocol( server.failover.type )

                    console.log( 'Will publish to refresh server connection...', server.settings.connection.publishTopic );
                    var message = new Paho.MQTT.Message( "no_data" );
                    message.destinationName = server.connectionDevice.mqtt_publish_topic ;
                    server.send( message );
                }
            }

            function initialSuccessCallback()
            {
                var server = this.invocationContext;
                server._successCallback();
                server.initialSubscriptions( true );
            }

            function successCallback()
            {
                var server = this.invocationContext;
                server._successCallback();
                server.initialSubscriptions( false );
            }

            server._successCallback = function()
            {
                console.log( this );
                var server = this;
                console.log( server );
                console.log( 'Successfully connected to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port );
                server.connectionStatus = 'CONNECTED';

                // $scope.$apply( server.connectionDevice.setProtocol( server.type ) );
                server.connectionDevice.setProtocol( server.type );

                if( server.failover && server.failover.active )
                {
                    console.log( 'Deactivating failover because mqtt reconnected' );
                    server.failover.activate( false );
                }                
            }
        }
    }
})();