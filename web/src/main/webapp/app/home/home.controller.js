(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('HomeController', HomeController);

    // HomeController.$inject = ['$scope', 'Principal', 'LoginService', '$state'];
    HomeController.$inject = [ '$http', '$scope', '$state', 'MqttClient', 'Door1', 'Window1R', 'Light1', 'TemperatureHumidity', 'Door2R', 'Net', 'Roller1_Auto', 'Window2R', 'Roller1', 'Light2', 'Alarm', 'IPCamera', 'IPCameraPanTilt', 'Houses', 'MotionCamera', 'MotionCameraPanTilt', 'Configuration' ];

    // function HomeController ($scope, Principal, LoginService, $state) {
    function HomeController( $http, $scope, $state, MqttClient, Door1, Window1R, Light1, TemperatureHumidity, Door2R, Net, Roller1_Auto, Window2R, Roller1, Light2, Alarm, IPCamera, IPCameraPanTilt, Houses, MotionCamera, MotionCameraPanTilt, Configuration ) {
        var vm = this;

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

        // function to generate uuid's for mqtt clients. This is necessary because if two clients connect to the same mqtt broker with the same
        // client id, the second client will disconnect the first, such a case is when multiple users connect simultaneously to the mqtt broker 
        // using this web app
        function uuidv4() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11)
                .replace(
                    /[018]/g, 
                    function( c ){
                        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                    }
                );
        }

        function getAllServers()
        {
            return [
                {
                    type: 'mqtt',
                    settings: { 
                        mqtt_broker_ip : '192.168.1.11',
                        mqtt_broker_port : 1884,
                        mqtt_client_id : uuidv4(),
                        configuration: {
                            subscribeTopic: 'A///CONFIGURATION/C/status',
                            publishTopic: 'A///CONFIGURATION/C/cmd'
                        }
                    },
                    houses: []
                }
            ];
        }
        var servers = getAllServers();
        console.log( 'servers: ', servers );
        initServers( servers );
        function initServers( servers )
        {
            for( var i = 0 ; i < servers.length ; i++ )
            {
                var server = servers[i];
                server.client = MqttClient;
                var client = server.client;
                client.observerDevices = [];
                client.init( server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port, server.settings.mqtt_client_id );
                
                client.connect({
                    onSuccess: successCallback,
                    onFailure: function() { console.log( 'Failed to connect to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port ); },
                    invocationContext: server
                });   

                client._client.onMessageArrived = function( message )
                {
                    var server = this.connectOptions.invocationContext;
                    console.log( server );
                    console.log( 'Received [topic] "message": [', message.destinationName.trim(), '] "' );//, message.payloadString, '"' );
                    if( message.destinationName == server.settings.configuration.subscribeTopic )
                    {
                        if( server.houses && server.houses.length > 0 )
                        {
                            unsubscribeHouses( server.client, server.houses );
                            removeHouses( server.houses );
                        }
                        server.houses = Configuration.generateHousesList( angular.fromJson( message.payloadString ) );                        
                        addHouses( server.houses );
                        subscribeHouses( server.client, server.houses );
                        return;
                    }

                    // if this is not a new houses-configuration message then it must be a message for the subscribed devices of the current house configuration
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
                        }
                    } );
                }

                function successCallback()
                {
                    var server = this.invocationContext;
                    // console.log( server );
                    console.log( 'Successfully connected to mqtt broker ', server.settings.mqtt_broker_ip, server.settings.mqtt_broker_port, ' subscribing to subscribeTopic...', server.settings.configuration.subscribeTopic );
                    client.subscribe( server.settings.configuration.subscribeTopic );
                    
                    console.log( 'Will publish to publshTopic to get house-configuration...', server.settings.configuration.publishTopic );
                    var message = new Paho.MQTT.Message( '{"cmd": "SEND"}' );
                    message.destinationName = server.settings.configuration.publishTopic ;
                    client.send( message );
                }
            }
        }

        
/*
        //MQTT
        var mqtt_broker_ip = '192.168.1.11';
        var mqtt_broker_port = 1884;
        var mqtt_client_id = 'eHomeWebGUI'
        var client = MqttClient;
        client.observerDevices = [];
        client.init( mqtt_broker_ip, mqtt_broker_port, mqtt_client_id );
        
        client.connect({
            onSuccess: successCallback,
            onFailure: function() { console.log( 'Failed to connect to mqtt broker ', mqtt_broker_ip, mqtt_broker_port ); }
        });   

        client._client.onMessageArrived = function( message )
        {
            console.log( 'Received [topic] "message": [', message.destinationName.trim(), '] "' );//, message.payloadString, '"' );
            if( message.destinationName == vm.houseConfigurationMqtt().subscribeTopic )
            {
                if( vm.houses && vm.houses.length > 0 )
                {
                    unsubscribeHouses( vm.houses );
                }
                vm.houses = Configuration.generateHousesList( angular.fromJson( message.payloadString ) );
                initCollapsedList();
                onNewConfiguration();
                return;
            }

            // if this is not a new houses-configuration message then it must be a message for the subscribed devices of the current house configuration
            for( var i = 0 ; i < client.observerDevices.length ; i++ )
            {
                // console.log( client.observerDevices[i] );
                $scope.$apply( function() { client.observerDevices[i].update( message.destinationName, message.payloadString ); } );
            }
        }

        client._client.onConnectionLost = function( error ) { 
            console.log( 'Connection lost with error: ', error, ' attempting to reconnect.' );
            client.connect( {
                onSuccess: successCallback,
                onFailure: function() { console.log( 'Failed to connect to mqtt broker ', mqtt_broker_ip, mqtt_broker_port ); }
            } );
        }
*/
        function successCallback()
        {
            console.log( 'Successfully connected to mqtt broker ', mqtt_broker_ip, mqtt_broker_port, ' subscribing to vm.vm.houseConfigurationMqtt().subscribeTopic...', vm.houseConfigurationMqtt().subscribeTopic );
            client.subscribe( vm.houseConfigurationMqtt().subscribeTopic );
            
            console.log( 'Will publish to vm.houseConfigurationMqtt().publshTopic to get house-configuration...', vm.houseConfigurationMqtt().publishTopic );
            var message = new Paho.MQTT.Message( '{"cmd": "SEND"}' );
            message.destinationName = vm.houseConfigurationMqtt().publishTopic ;
            client.send( message );
        }

        function unsubscribeHouses( client, houses )
        {
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
            for( var rm = 0 ; rm < houses.length ; rm++ )
            {
                for( var h = 0 ; h < vm.houses.length ; h++ )
                {
                    if( vm.houses[h].name == houses[rm].name )
                    {
                        console.log( 'removing house ', houses[rm].name );
                        vm.houses.splice( h, 1 );
                    }
                }
            }
        }

        function addHouses( houses )
        {
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
