(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('XmppServer', XmppServer);

        XmppServer.$inject = [ '$interval' ];

    function XmppServer( $interval ) {

        return {
            init: init
        };

        function init( server, removeConf, primaryServer, failover )
        {
            console.log( 'initXmppServer( server: ', server, ',\n failover ): ', failover );
            server.isFailover = ( typeof failover !== 'undefined' ) ? failover : false;
            if( typeof failover !== 'undefined' )
            {
                server.primaryServer = primaryServer;
            }
            server.messageQueue = new Queue();            

            if( server.settings.host.startsWith( "https" ) )
            {
                server.client = XMPP.createClient({
                    jid: server.settings.user,
                    password: server.settings.password,

                    // If you have a .well-known/host-meta.json file for your
                    // domain, the connection transport config can be skipped.

                    transport: 'bosh',
                    boshURL: server.settings.host
                });                
            }
            else if( server.settings.host.startsWith( "ws" ) || server.settings.host.startsWith( "wss" ) )
            {
                server.client = XMPP.createClient({
                    jid: server.settings.user,
                    password: server.settings.password,

                    // If you have a .well-known/host-meta.json file for your
                    // domain, the connection transport config can be skipped.

                    transport: 'websocket',
                    wsURL: server.settings.host
                });
            }
            console.log( 'connecting to ', server.settings.host, ' as ', server.settings.user );
            var client = server.client;
            client.server = server;            

            server.unsubscribeConf = function()
            {
                this.baseUnsubscribeConf( this.conf );
            }

            server.removeConf = function()
            {
                removeConf( this.conf );
            }

            server.subscribe = function( topic )
            {
                // console.log( 'my xmpp subscribe for topic ', topic );
                // console.log( 'xmpp subscribe with client: ', client );
                var body = '{ "cmd": "subscribe", "topic": ' + '"' + topic + '" }';
                server._send( body );
                // console.log( 'sent subscribe ', body, ' to ', server.settings.destination );
            }

            server.subscribeDevice = function( device, topic )
            {
                server.subscribe( topic );
                server.observerDevices.push( device );
            }

            server.unsubscribe = function( topic )
            {
                // console.log( 'my xmpp unsubscribe for topic ', topic );
                var body = '{ "cmd": "unsubscribe", "topic": ' + '"' + topic + '" }';
                server._send( body );
                // console.log( 'sent unsubscribe ', body, ' to ', server.settings.destination );
            }

            server.unsubscribeDevice = function( device, topic )
            {
                server.unsubscribe( topic );
                // console.log( 'before xmpp.unsubscribeDevice xmpp server has ', server.observerDevices.length, ' observerDevices' );
                for( var i = 0 ; i < server.observerDevices.length; i++ )
                {
                    // console.log( '\tcomparing ', server.observerDevices[i], ' with ', device );
                    if( server.observerDevices[i] === device )
                    {
                        // console.log( 'removing observer device ', server.observerDevices[i], ' from server: ', server.type );
                        server.observerDevices.splice( i, 1 );
                        break;
                    }
                }
            }

            server.send = function( mqttMessage )
            {
                var text = '{ "cmd":"publish", "topic": ' + '"' + mqttMessage.destinationName + '", "message": "' + btoa( mqttMessage.payloadString ) + '" }';
                server._send( text );
                // console.log( 'sent message "', text, '" to ', server.settings.destination );
            }

            server._send = function( message )
            {
                if( client.sessionStarted )
                {
                    client.sendMessage(
                        {
                            to: server.settings.destination,
                            body: message
                        }
                    );
                    // console.log( '_sent message "', message, '" to ', server.settings.destination );
                }
                else
                {
                    server.messageQueue.enqueue( message );
                    // console.log( 'queued message "', message, '" to ', server.settings.destination );
                }
            }

            server.activate = function( active )
            {
                server.active = active;
                var message = active ? 'activate-xmpp' : 'deactivate-xmpp';
                // client.sendMessage( { to: server.settings.destination, body: message } );
                server._send( message );
                if( active )
                {
                    // $scope.$apply( server.connectionDevice.setProtocol( server.type ) );
                    server.connectionDevice.setProtocol( server.type );
                }
            }

            client.on('session:started', function () {
                console.log( 'session:started so i must be connected!' );
                client.getRoster();
                client.sendPresence();
                client.enableCarbons(); // This is useful if you want to receive a copy of a message that you sent from one device, and receive on all other logged devices.

                server.connectionStatus = 'CONNECTED';
                server.showXmppErrorFn( false );

                // before doing any subscriptions, set active status so that if inactive, the xmpp_proxy will not
                // send received mqtt messages that arrive after the subscriptions
                // console.log( 'server.isFailover: ', server.isFailover, ' typeof server.active:', typeof server.active );
                if( server.isFailover )
                {
                    if( typeof server.active !== 'undefined' )
                    {
                        console.log( 'setting server.activate( ', server.active, ' )' );
                        server.activate( server.active );
                    }
                }
                else
                {
                    console.log( 'activating xmpp_proxy' );
                    server.activate( true );
                }

                if( !server.isFailover || server.active )
                {
                    // $scope.$apply( server.connectionDevice.setProtocol( server.type ) );
                    server.connectionDevice.setProtocol( server.type );
                }

                //subscribe to configuration topic
                client.sendMessage(
                    {
                        to: server.settings.destination,
                        body: '{ "cmd":"subscribe", "topic": ' + '"' + server.settings.configuration.subscribeTopic + '" }'
                    }
                );
                console.log( 'sent message ', server.settings.configuration.subscribeTopic, ' to ', server.settings.destination, 'with client: ', client );

                console.log( 'xmpp: ', this );
                if( !server.isFailover )
                {
                    //send cmd to have connection sent back to us
                    client.sendMessage(
                        {
                            to: server.settings.destination,
                            body: '{ "cmd":"publish", "topic": ' + '"' + server.connectionDevice.mqtt_publish_topic + '", "message": "' + btoa( "no_data" ) + '" }'
                        }
                    );
                    console.log( 'sent message ', server.connectionDevice.mqtt_publish_topic, ' to ', server.settings.destination );

                    //send cmd to have configuration sent back to us
                    client.sendMessage(
                        {
                            to: server.settings.destination,
                            body: '{ "cmd":"publish", "topic": ' + '"' + server.settings.configuration.publishTopic + '", "message": "' + btoa( server.settings.configuration.publishMessage ) + '" }'
                        }
                    );
                    console.log( 'sent message ', server.settings.configuration.publishTopic, ' to ', server.settings.destination );
                }

                while( !server.messageQueue.isEmpty() )
                {
                    var message = server.messageQueue.dequeue();
                    client.sendMessage(
                        {
                            to: server.settings.destination,
                            body: message
                        }
                    );
                    // console.log( 'sent queued message "', message, '" to ', server.settings.destination );
                }
            });

            client.on( 'disconnected', function( params ){
                console.log( 'disconnected from ', server.settings.host );
                server.connectionStatus = 'DISCONNECTED';
                server.showXmppErrorFn( true );
                // if this is a failover server, the connectionDevice belongs to the main server
                if( !server.isFailover || server.active )
                {
                    server.connectionDevice.disconnected();
                    server.connectionDevice.connecting( server.type );
                }
                // try
                // {
                //     client.connect();
                // }
                // catch( error )
                // {
                //     console.log( 'Xmpp-server error trying to connect: ', error );
                // }
            });

            // ahat: Note. It seems that whatever arrives as a chat also arrives as a message
            //       so I cancel the on 'chat' callback
            // client.on( 'chat', function (msg) {
            //     // client.sendMessage({
            //     // to: msg.from,
            //     // body: 'You sent: ' + msg.body
            //     // });
            //     var text = pako.inflate( atob( msg.body ), { to: 'string' } );
            //     console.log( 'received [chat]  from ', msg.from, ': ', text );
            //     var message = angular.fromJson( text );
            //     if( message.topic == this.server.settings.configuration.subscribeTopic )
            //     {
            //         updateConfiguration( this.server, message.payload );
            //         return;
            //     }
            // });

            client.on( 'message', function (msg) {
                // console.log( 'received xmpp message: ', msg );
                var text = pako.inflate( atob( msg.body ), { to: 'string' } );
                console.log( 'received xmpp message from ', msg.from, ': ', text );

                server.updateLast();
                
                var message = angular.fromJson( text );
                // if( message.topic == server.settings.configuration.subscribeTopic )
                // {
                //     var payload = angular.fromJson( message.payload );
                //     if( !payload.main )
                //     {
                //         updateConfiguration( server, message.payload );
                //     }
                // }
                
                // console.log( this );
                // $scope.observerDevices = server.observerDevices;
                for( var i = 0 ; i < server.observerDevices.length ; i++ )
                {
                    // console.log( 'updating device: ', this.server.observerDevices[i] );                    
                    // $scope.$apply( function() { $scope.observerDevices[i].update( message.topic, message.payload ); } );
                    // $scope.observerDevices[i].update( message.topic, message.payload );
                    server.observerDevices[i].update( message.topic, message.payload );
                }
            });

            client.connect();
            // client.server.showXmppErrorFn( true );

            server.connectionCheckInterval = $interval( function() {
                if( !client.sessionStarted )
                {
                    console.log( 'Xmpp client still not connected. Attempting reconnection' );
                    // console.log( server );
                    client.server.showXmppErrorFn( true );
                    server.connectionStatus = 'CONNECTING';
                    if( !server.isFailover || server.active )
                    {
                        server.connectionDevice.connecting( server.type );
                    }
                    client.connect();
                }
            }, 5000, 0, true, client );

            server.configurationCheckInterval = $interval( function() {
                if( client.sessionStarted && server.configurationDevice.status != 'SUCCESS' && 
                    ( !server.isFailover || server.active )
                )
                {
                    console.log( 'Xmpp server still gets house configuration ', server.configurationDevice.status, ', republishing to get configuration' );
                    client.sendMessage(
                        {
                            to: server.settings.destination,
                            body: '{ "cmd":"publish", "topic": ' + '"' + server.settings.configuration.publishTopic + '", "message": "' + btoa( server.settings.configuration.publishMessage ) + '" }'
                        }
                    );
                }
            }, 5000, 0, true, client );

            server.stopCheckIntervals = function()
            {
                server.baseStopCheckIntervals();
            }
        }
    }
})();