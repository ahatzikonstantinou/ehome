(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerController', ServerController);

    // ServerController.$inject = ['$scope', 'Principal', 'LoginService', '$state'];
    ServerController.$inject = [ '$http', '$scope', '$state', 'MqttClient', 'Door1', 'Window1R', 'Light1', 'TemperatureHumidity', 'Door2R', 'Net', 'Roller1_Auto', 'Window2R', 'Roller1', 'Light2', 'Alarm', 'IPCamera', 'IPCameraPanTilt', 'MotionCamera', 'MotionCameraPanTilt', 'Configuration', 'ServerConnection' ];

    // function ServerController ($scope, Principal, LoginService, $state) {
    function ServerController( $http, $scope, $state, MqttClient, Door1, Window1R, Light1, TemperatureHumidity, Door2R, Net, Roller1_Auto, Window2R, Roller1, Light2, Alarm, IPCamera, IPCameraPanTilt, MotionCamera, MotionCameraPanTilt, Configuration, ServerConnection ) {
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

        initServer( vm.server );
        function initServer( server )
        {
            server.device = new ServerConnection( server, server.settings.connection.subscribeTopic, server.settings.connection.publishTopic, {} );
            // console.log( 'server.device: ', server.device );
            switch( server.type )
            {
                case 'mqtt':
                    initMqttServer( server );
                    break;
                case 'xmpp':
                    initXmppServer( server );
                    break;
                default:
                    console.log( 'Unknown server type [', server.type, ']: ', server );
            }                
        }

        XMPP.Client.prototype.subscribe = function( topic )
        {
            console.log( 'xmpp.subscribe override, topic: ', topic );
        }

        XMPP.Client.prototype.publish = function( topic )
        {
            console.log( 'xmpp.publish override, topic: ', topic );
        }

        function initXmppServer( server )
        {
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
            client.observerDevices = [];
            client.subscribe = function( topic )
            {
                // console.log( 'my xmpp subscribe for topic ', topic );
                var body = '{ "cmd": "subscribe", "topic": ' + '"' + topic + '" }';
                client.sendMessage(
                    {
                        to: server.settings.destination,
                        body: body
                    }
                );
                console.log( 'sent message ', body, ' to ', server.settings.destination );
            }

            client.unsubscribe = function( topic )
            {
                // console.log( 'my xmpp unsubscribe for topic ', topic );
                var body = '{ "cmd": "unsubscribe", "topic": ' + '"' + topic + '" }';
                client.sendMessage(
                    {
                        to: server.settings.destination,
                        body: body
                    }
                );
                console.log( 'sent message ', body, ' to ', server.settings.destination );
            }

            client.on('session:started', function () {
                console.log( 'session:started so i must be connected!' );
                client.getRoster();
                client.sendPresence();

                //subscribe to configuration topic
                client.sendMessage(
                    {
                        to: server.settings.destination,
                        body: '{ "cmd":"subscribe", "topic": ' + '"' + server.settings.configuration.subscribeTopic + '" }'
                    }
                );
                console.log( 'sent message ', server.settings.configuration.subscribeTopic, ' to ', server.settings.destination );

                //send cmd to have configuration sent back to us
                client.sendMessage(
                    {
                        to: server.settings.destination,
                        body: '{ "cmd":"publish", "topic": ' + '"' + server.settings.configuration.publishTopic + '", "message": "' + btoa( server.settings.configuration.publishMessage ) + '" }'
                    }
                );
                console.log( 'sent message ', server.settings.configuration.publishTopic, ' to ', server.settings.destination );
            });

            client.on( 'disconnected', function(){
                console.log( 'disconnected from ', server.settings.host );  
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
                var text = pako.inflate( atob( msg.body ), { to: 'string' } );
                console.log( 'received [message]  from ', msg.from, ': ', text );
                var message = angular.fromJson( text );
                if( message.topic == this.server.settings.configuration.subscribeTopic )
                {
                    updateConfiguration( this.server, message.payload );
                    return;
                }
                
                // if this is not a new houses-configuration message then it must be a message for the subscribed devices of the current house configuration
                // console.log( this );
                $scope.observerDevices = this.observerDevices;
                for( var i = 0 ; i < this.observerDevices.length ; i++ )
                {
                    // console.log( this.observerDevices[i] );                    
                    $scope.$apply( function() { $scope.observerDevices[i].update( message.topic, message.payload ); } );
                }
            });

            client.connect();
        }

        function initMqttServer( server )
        {
            server.client = MqttClient;
            var client = server.client;            
            client.observerDevices = [];
            client.init( server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port, server.settings.mqtt_client_id );
            
            client.connect({
                onSuccess: successCallback,
                onFailure: function() { console.log( 'Failed to connect to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port ); },
                invocationContext: server,
                keepAliveInterval: server.settings.connection.keepAliveInterval
            });   

            client._client.onMessageArrived = function( message )
            {
                var server = this.connectOptions.invocationContext;
                //console.log( server );
                console.log( 'Received [topic] "message": [', message.destinationName.trim(), '] "', message.payloadString, '"' );
                if( message.destinationName == server.settings.configuration.subscribeTopic )
                {
                    updateConfiguration( server, message.payloadString );                    
                }

                // if this is not a new houses-configuration message then it must be a message for the subscribed devices of the current house configuration
                if( message.destinationName == 'A///MOTION/M/status' )
                {
                    console.log( message.payloadString );
                }
                for( var i = 0 ; i < server.client.observerDevices.length ; i++ )
                {
                    // console.log( client.observerDevices[i] );
                    $scope.$apply( function() { server.client.observerDevices[i].update( message.destinationName, message.payloadString ); } );
                }
            }

            client._client.onConnectionLost = function( error ) { 
                console.log( 'Connection lost with error: ', error, ' attempting to reconnect.' );
                client.connect( {
                    onSuccess: successCallback,
                    onFailure: function() 
                    { 
                        var server = invocationContext;
                        console.log( 'Failed to connect to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port ); 
                    },
                    invocationContext: server,
                    keepAliveInterval: server.settings.connection.keepAliveInterval
                } );
            }

            function successCallback()
            {
                console.log( this );
                var server = this.invocationContext;
                console.log( server );
                console.log( 'Successfully connected to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port );

                console.log( 'Subscribing to connection topic...', server.device.mqtt_subscribe_topic );
                client.observerDevices.push( server.device );
                client.subscribe( server.device.mqtt_subscribe_topic );
                server.device.setPublisher( client );

                console.log( 'Subscribing to subscribeTopic...', server.settings.configuration.subscribeTopic );
                client.subscribe( server.settings.configuration.subscribeTopic );
                
                console.log( 'Will publish to get server connection...', server.settings.connection.publishTopic );
                var message = new Paho.MQTT.Message( "no_data" );
                message.destinationName = server.device.mqtt_publish_topic ;
                client.send( message );

                console.log( 'Will publish to publshTopic to get house-configuration...', server.settings.configuration.publishTopic );
                message = new Paho.MQTT.Message( server.settings.configuration.publishMessage );
                message.destinationName = server.settings.configuration.publishTopic ;
                client.send( message );
            }
        }

        function successCallback()
        {
            console.log( 'Successfully connected to mqtt broker ', mqtt_broker_ip, mqtt_broker_port, ' subscribing to vm.vm.houseConfigurationMqtt().subscribeTopic...', vm.houseConfigurationMqtt().subscribeTopic );
            client.subscribe( vm.houseConfigurationMqtt().subscribeTopic );
            
            console.log( 'Will publish to vm.houseConfigurationMqtt().publshTopic to get house-configuration...', vm.houseConfigurationMqtt().publishTopic );
            var message = new Paho.MQTT.Message( '{"cmd": "SEND"}' );
            message.destinationName = vm.houseConfigurationMqtt().publishTopic ;
            client.send( message );
        }

        function updateConfiguration( server, messagePayloadString )
        {
            if( server.houses && server.houses.length > 0 )
            {
                unsubscribeHouses( server.client, server.houses );
                removeHouses( server.houses );
            }
            server.houses = Configuration.generateHousesList( angular.fromJson( messagePayloadString ) );
            console.log( 'generated ', server.houses.length, ' houses' );
            
            $scope.$apply( addHouses( server.houses ) );
            console.log( vm.houses.length + ' houses should be rendered for server ' + server.name );
            subscribeHouses( server.client, server.houses );
        }

        function unsubscribeHouses( client, houses )
        {
            console.log( 'unsubscribeHouses for ', houses.length, ' houses' );
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
                                unsubscribe( client, houses[h].floors[f].rooms[r].items[i] );
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
                            unsubscribe( client, houses[h].items[i] );
                        }
                    }
                }
            }
            client.observerDevices = [];
        }

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

        function subscribeHouses( client, houses )
        {
            console.log( 'subscribing ', houses.length, ' houses' );
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
                                subscribe( client, houses[h].floors[f].rooms[r].items[i] );
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
                            subscribe( client, houses[h].items[i] );
                        }
                    }
                }
            }
        }

        function subscribe( client, item )
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
                        client.observerDevices.push( item.device );
                        client.subscribe( item.device.mqtt_subscribe_topic );
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
                        item.device.setPublisher( client );
                    }
                    break;
                default:
                    break;
            }
        }

        function unsubscribe( client, item )
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
                        client.unsubscribe( item.device.mqtt_subscribe_topic );
                    }
                    break;
                default: 
                    // console.log( 'Unknown item type [', item.type, ']' );
                    break;
            }
        }

    }
})();
