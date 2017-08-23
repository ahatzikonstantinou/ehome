(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerController', ServerController);

    // ServerController.$inject = ['$scope', 'Principal', 'LoginService', '$state'];
    ServerController.$inject = [ '$scope', 'Configuration', 'Server' ];

    // function ServerController ($scope, Principal, LoginService, $state) {
    function ServerController( $scope, Configuration, Server ) {
        var vm = this;
        vm.server = $scope.server;
        vm.account = null;
        vm.isAuthenticated = true; //null;

        // vm.login = LoginService.open;
        // vm.register = register;
        // $scope.$on('authenticationSuccess', function() {
        //     getAccount();
        // });

        // getAccount();

        // function getAccount() {
        //     Principal.identity().then(function(account) {
        //         vm.account = account;
        //         vm.isAuthenticated = Principal.isAuthenticated;
        //     });
        // }
        // function register () {
        //     $state.go('register');
        // }

        vm.houses = [];
        
        // console.log( vm.houses );
        vm.isCollapsed = [];        

        function createCollapsedHouse( house )
        {
            var collapsedHouse = { 
                house: true,
                filter: { DOOR: true, WINDOW: true, LIGHT: true, CLIMATE: true, COVER: true, ALARM: true, CAMERA: true, MOTION: true },
                allChildrenExpanded: false,
                showMqttTopics: false,
                floor: []
            };
            for( var f  = 0 ; f < house.floors.length ; f++ )
            {
                collapsedHouse.floor[f] = { floor: true, room: [] };
                // console.log( 'House[',i,'].floors[',f,']: ', vm.houses[i].floors[f] );
                for( var r  = 0 ; r < house.floors[f].rooms.length ; r++ )
                {
                    collapsedHouse.floor[f].room[r] = { room: true };
                }
            }
            return collapsedHouse;
        }

/*
        function initCollapsedList()
        {
            for( var i = 0 ; i < vm.houses.length ; i++ )
            {            
                vm.isCollapsed[i] = createCollapsedHouse( vm.houses[i] );
            }
        }
*/
        vm.expandAllChildren = function( house, expand )
        {
            for( var houseIndex = 0 ; houseIndex < vm.houses.length ; houseIndex++ )
            {
                if( !angular.equals( vm.houses[houseIndex], house ) )
                {
                    continue;
                }
                            
                vm.isCollapsed[ houseIndex ].house = expand;
                vm.isCollapsed[ houseIndex ].allChildrenExpanded = !expand;
                for( var f = 0 ; f < vm.houses[houseIndex].floors.length ; f++ )
                {
                    vm.isCollapsed[houseIndex].floor[f].floor = expand;
                    for( var r  = 0 ; r < vm.houses[houseIndex].floors[f].rooms.length ; r++ )
                    {
                        vm.isCollapsed[houseIndex].floor[f].room[r].room = expand;
                    }
                }
            }
        }
        
        // console.log( vm.isCollapsed );

        Server.init( vm.server, updateConfiguration, removeHouses );
/*        
        initServer( vm.server );
        function initServer( server, failover, connectionDevice, configurationDevice )
        {
            server.connectionStatus = 'DISCONNECTED'; //CONNECTING, CONNECTED            
            
            server.connectionDevice = (typeof connectionDevice !== 'undefined' ) ? connectionDevice : new ServerConnection( server, server.settings.connection.subscribeTopic, server.settings.connection.publishTopic, {} );
            server.connectionDevice.disconnected();
            // console.log( 'server.connectionDevice: ', server.connectionDevice );

            server.configurationDevice = (typeof configurationDevice !== 'undefined' ) ? configurationDevice : new HouseConfigurationStatus( server, server.settings.configuration.subscribeTopic, {}, updateConfiguration );
            
            server.observerDevices = [];
            server.observerDevices.push( server.connectionDevice );
            server.observerDevices.push( server.configurationDevice );
            
            server.configurationStatus = 'NOT_SET'; //'UNAVAILABLE'; //AVAILABLE

            server.setHouses = function( houses, removeExisting )
            {
                if( removeExisting )
                {
                    this.unsubscribeHouses();
                    this.removeHouses();
                }
                this.houses = houses;
                if( this.failover )
                {
                    this.failover.setHouses( houses );
                }
            }
            
            switch( server.type )
            {
                case 'mqtt':
                    // initMqttServer( server );
                    MqttServer.init( server, unsubscribeHouses, removeHouses, initServer );
                    break;
                case 'xmpp':
                    // initXmppServer( server, failover );
                    XmppServer.init( server, unsubscribeHouses, removeHouses, failover );
                    break;
                default:
                    console.log( 'Unknown server type [', server.type, ']: ', server );
            }                
        }

        function initXmppServer( server, failover )
        {
            console.log( 'initXmppServer( server: ', server, ',\n failover ): ', failover );
            server.isFailover = ( typeof failover !== 'undefined' ) ? failover : false;
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
            else if( server.settings.host.startsWith( "ws" ) || server.settings.host.startsWith( "ws" ) )
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

            server.unsubscribeHouses = function()
            {
                unsubscribeHouses( server, server.houses );                
            }

            server.removeHouses = function()
            {
                removeHouses( server.houses );
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
                if( active && server.connectionDevice )
                {
                    $scope.$apply( server.connectionDevice.setProtocol( server.type ) );
                }
            }

            client.on('session:started', function () {
                console.log( 'session:started so i must be connected!' );
                client.getRoster();
                client.sendPresence();

                if( server.connectionDevice && !server.isFailover )
                {
                    $scope.$apply( server.connectionDevice.setProtocol( server.type ) );
                }

                // before doing any subscriptions, set active status so that if inactive, the xmpp_proxy will not
                // send received mqtt messages that arrive after the subscriptions
                // console.log( 'server.isFailover: ', server.isFailover, ' typeof server.active:', typeof server.active );
                if( server.isFailover && typeof server.active !== 'undefined' )
                {
                    console.log( 'setting server.activate( ', server.active, ' )' );
                    server.activate( server.active );
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
                    console.log( 'sent message ', server.settings.configuration.publishTopic, ' to ', server.settings.destination );

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

            client.on( 'disconnected', function(){
                console.log( 'disconnected from ', server.settings.host );  
                if( server.connectionDevice )
                {
                    $scope.$apply( server.connectionDevice.disconnected() );
                }
                client.connect();
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
                $scope.observerDevices = server.observerDevices;
                for( var i = 0 ; i < server.observerDevices.length ; i++ )
                {
                    // console.log( 'updating device: ', this.server.observerDevices[i] );                    
                    // $scope.$apply( function() { $scope.observerDevices[i].update( message.topic, message.payload ); } );
                    $scope.observerDevices[i].update( message.topic, message.payload );
                }
            });

            client.connect();

            $interval( function() {
                if( !client.sessionStarted )
                {
                    console.log( 'Xmpp client still not connected. Attempting reconnection' );
                    client.connect();
                }
            }, 5000, 0, true, client );

            $interval( function() {
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
        }


        function initMqttServer( server )
        {
            if( server.failover )
            {
                console.log( 'Initialising failover of server ', server.name );
                initServer( server.failover, true, server.connectionDevice, server.configurationDevice );
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
    
            server.unsubscribeHouses = function()
            {
                unsubscribeHouses( this, this.houses );
                if( this.failover )
                {
                    this.failover.unsubscribeHouses();
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
                // console.log( 'my mqtt server subscribe for topic ', topic );
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
                // console.log( 'my mqtt server subscribe for topic ', topic );
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
                    $scope.$apply( server.connectionDevice.disconnected() );

                    if( server.failover )
                    {
                        console.log( 'Activating failover until mqtt reconnects, failover: ', server.failover );                    
                        server.failover.activate( true );
                        $scope.$apply( server.connectionDevice.setProtocol( server.failover.type ) );

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
                                    $scope.$apply( server.connectionDevice.disconnected() );
                                }

                                if( server.failover && !server.failover.active )
                                {
                                    console.log( 'Activating failover until mqtt reconnects, failover: ', server.failover );                    
                                    server.failover.activate( true );
                                    $scope.$apply( server.connectionDevice.setProtocol( server.failover.type ) );

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
                $scope.$apply( server.connectionDevice.disconnected() );            

                if( server.failover && !server.failover.active )
                {
                    console.log( 'Activating failover until mqtt reconnects, failover: ', server.failover );                    
                    server.failover.activate( true );
                    $scope.$apply( server.connectionDevice.setProtocol( server.failover.type ) );

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

                $scope.$apply( server.connectionDevice.setProtocol( 'Mqtt' ) );

                if( server.failover && server.failover.active )
                {
                    console.log( 'Deactivating failover because mqtt reconnected' );
                    server.failover.activate( false );
                }                
            }
        }
*/

        function updateConfiguration( server, messagePayloadString )
        {
            if( server.houses && server.houses.length > 0 )
            {
                console.log( 'unsubscribing and removing ', server.houses, ' houses that already existed in the server: ', server.type );
            }
            if( vm.houses && vm.houses.length > 0 )
            {
                console.log( 'unsubscribing and removing ', vm.houses, ' houses that already existed in the web app controller, (server: ', server.type, ')' );
            }

            if( ( server.houses && server.houses.length > 0 ) || ( vm.houses && vm.houses.length > 0 ) )
            {
                console.log( 'before unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
                server.unsubscribeHouses(); //unsubscribeHouses( server, server.houses );
                console.log( 'after unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
                server.removeHouses(); //removeHouses( server.houses );
            }

            server.setHouses( Configuration.generateHousesList( angular.fromJson( messagePayloadString ) ) );
            console.log( 'generated ', server.houses.length, ' houses' );

            $scope.$apply( addHouses( server.houses ) );
            console.log( vm.houses.length + ' houses should be rendered for server ', server );
            
            console.log( 'before subscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            if( server.failover )
            {
                console.log( 'before subscribing server.failover: ', server.failover.type, ' has ', server.failover.observerDevices.length, ' observerDevices: ', server.failover.observerDevices );
            }
            // subscribeHouses( server, server.houses );
            server.subscribeHouses( server.houses );
            
            console.log( 'after subscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            if( server.failover )
            {
                console.log( 'after subscribing server.failover: ', server.failover.type, ' has ', server.failover.observerDevices.length, ' observerDevices: ', server.failover.observerDevices );
            }    
        }
/*
        function unsubscribeHouses( server, houses )
        {
            console.log( 'unsubscribeHouses for ', houses.length, ' houses for server: ', server.type );
            for( var h = 0 ; h < houses.length ; h++ )
            {
                // console.log( 'Doing house "', vm.houses[h].name, '":' )
                for( var f = 0 ; f < houses[h].floors.length ; f++ )
                {
                    // console.log( '\tfloor "', vm.houses[h].floors[f].name, '":' )
                    for( var r = 0 ; r < houses[h].floors[f].rooms.length ; r++ )
                    {
                        // console.log( '\t\troom "', vm.houses[h].floors[f].rooms[r].name, '":' )
                        for( var i = 0 ; i < houses[h].floors[f].rooms[r].items.length ; i++ )
                        {
                            if( houses[h].floors[f].rooms[r].items[i].protocol = 'mqtt' )
                            {
                                unsubscribe( server, houses[h].floors[f].rooms[r].items[i] );
                            }
                        }
                    }
                }
                if( houses[h].items )
                {
                    for( var i = 0 ; i < houses[h].items.length ; i++ )
                    {
                        if( houses[h].items[i].protocol = 'mqtt' )
                        {
                            unsubscribe( server, houses[h].items[i] );
                        }
                    }
                }
            }
            // server.observerDevices = [];
        }

        function subscribeHouses( server, houses )
        {
            console.log( 'subscribing ', houses.length, ' houses to server: ', server.type );
            // subscribe to all topics
            for( var h = 0 ; h < houses.length ; h++ )
            {
                // console.log( 'Doing house "', vm.houses[h].name, '":' )
                for( var f = 0 ; f < houses[h].floors.length ; f++ )
                {
                    // console.log( '\tfloor "', vm.houses[h].floors[f].name, '":' )
                    for( var r = 0 ; r < houses[h].floors[f].rooms.length ; r++ )
                    {
                        // console.log( '\t\troom "', vm.houses[h].floors[f].rooms[r].name, '":' )
                        for( var i = 0 ; i < houses[h].floors[f].rooms[r].items.length ; i++ )
                        {
                            if( houses[h].floors[f].rooms[r].items[i].protocol = 'mqtt' )
                            {
                                subscribe( server, houses[h].floors[f].rooms[r].items[i] );
                            }
                        }
                    }
                }
                if( houses[h].items )
                {
                    for( var i = 0 ; i < houses[h].items.length ; i++ )
                    {
                        if( houses[h].items[i].protocol = 'mqtt' )
                        {
                            subscribe( server, houses[h].items[i] );
                        }
                    }
                }
            }
        }

        function subscribe( server, item )
        {
            // console.log( '\t\titem:', item );
            switch( item.type )
            {
                case 'ALARM':
                case 'NET':
                case 'DOOR1':
                case 'DOOR2R':
                case 'LIGHT1':
                case 'LIGHT2':
                case 'MOTIONCAMERA':
                case 'MOTIONCAMERAPANTILT':
                case 'ROLLER1':
                case 'ROLLER1_AUTO':
                case 'TEMPERATURE_HUMIDITY':
                case 'WINDOW1':
                case 'WINDOW1R':
                case 'WINDOW2R':
                    if( !item.device )
                    {
                        // console.log( 'No device property found!' );
                    }
                    else if( item.device.mqtt_subscribe_topic )
                    {
                        // console.log( 'Subscribing ', item.device );        
                        server.subscribeDevice( item.device, item.device.mqtt_subscribe_topic );
                    }
                    break;
                default: 
                    // console.log( 'Unknown item type [', item.type, ']' );
                    break;
            }
            switch( item.type )
            {
                case 'ALARM':
                case 'LIGHT1':
                case 'LIGHT2':
                case 'MOTIONCAMERA':
                case 'MOTIONCAMERAPANTILT':
                case 'ROLLER1_AUTO':
                    if( item.device )
                    {
                        item.device.setPublisher( server );
                    }
                    break;
                default:
                    break;
            }
        }

        function unsubscribe( server, item )
        {
            // console.log( '\t\titem:', item );
            switch( item.type )
            {
                case 'ALARM':
                case 'NET':
                case 'DOOR1':
                case 'DOOR2R':
                case 'LIGHT1':
                case 'LIGHT2':
                case 'MOTIONCAMERA':
                case 'MOTIONCAMERAPANTILT':
                case 'ROLLER1':
                case 'ROLLER1_AUTO':
                case 'TEMPERATURE_HUMIDITY':
                case 'WINDOW1':
                case 'WINDOW1R':
                case 'WINDOW2R':
                    if( !item.device )
                    {
                        // console.log( 'No device property found!' );
                    }
                    else if( item.device.mqtt_subscribe_topic )
                    {
                        // console.log( 'Unsubscribing ', item.device, ' from server: ', server.type );
                        server.unsubscribeDevice( item.device, item.device.mqtt_subscribe_topic );
                    }
                    break;
                default: 
                    // console.log( 'Unknown item type [', item.type, ']' );
                    break;
            }
        }
*/
        function removeHouses( houses )
        {
            console.log( 'removing ', houses.length, ' houses' );
            for( var rm = 0 ; rm < houses.length ; rm++ )
            {
                for( var h = 0 ; h < vm.houses.length ; h++ )
                {
                    if( vm.houses[h].name == houses[rm].name )
                    {
                        console.log( 'removing house ', houses[rm].name );
                        vm.houses.splice( h, 1 );
                        vm.isCollapsed.splice( h, 1 );
                    }
                }
            }
        }

        function addHouses( houses )
        {
            console.log( 'adding ', houses.length, ' houses' );
            var add = houses.sort( function( a, b ) { return a.name.localeCompare( b.name ); } );
            for( var a = 0 ; a < add.length ; a++ )
            {
                var added = false;
                for( var h = 0 ; h < vm.houses ; h++ )
                {
                    if( a.name.localeCompare( vm.houses[h].name ) > 0 )
                    {
                        vm.houses.splice( h, 0, add[a] );
                        vm.isCollapsed.splice( h, 0, createCollapsedHouse( add[a] ) );
                        added = true;
                        break;
                    }
                }
                if( !added )
                {
                    vm.houses.push( add[a] );
                    vm.isCollapsed.push( createCollapsedHouse( add[a] ) );
                }
                console.log( 'added house ', add[a] );

            }
        }

    }
})();
