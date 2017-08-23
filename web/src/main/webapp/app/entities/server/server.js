(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Server', Server);

    Server.$inject = [ 'MqttServer', 'XmppServer', 'ServerConnection', 'HouseConfiguration' ];

    function Server( MqttServer, XmppServer, ServerConnection, HouseConfiguration ) {

        return {
            init: init
        };

        function init( server, updateConfiguration, removeHouses, failover, connectionDevice, configurationDevice )
        {
            server.connectionStatus = 'DISCONNECTED'; //CONNECTING, CONNECTED            
            
            server.connectionDevice = (typeof connectionDevice !== 'undefined' ) ? connectionDevice : new ServerConnection( server, server.settings.connection.subscribeTopic, server.settings.connection.publishTopic, {} );
            server.connectionDevice.disconnected();
            // console.log( 'server.connectionDevice: ', server.connectionDevice );

            server.configurationDevice = (typeof configurationDevice !== 'undefined' ) ? configurationDevice : new HouseConfiguration( server, server.settings.configuration.subscribeTopic, {}, updateConfiguration );
            
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

            server.baseUnsubscribeHouses = function( houses )
            {
                console.log( 'unsubscribeHouses for ', houses.length, ' houses for server: ', this.type );
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
                                    this.baseUnsubscribeItem( houses[h].floors[f].rooms[r].items[i] );
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
                                this.baseUnsubscribeItem( server, houses[h].items[i] );
                            }
                        }
                    }
                }
                // server.observerDevices = [];
            }
    
            server.subscribeHouses = function ()
            {
                var houses = this.houses;
                console.log( 'subscribing ', houses.length, ' houses to server: ', this.type );
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
                                    this.baseSubscribeItem( houses[h].floors[f].rooms[r].items[i] );
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
                                this.baseSubscribeItem( houses[h].items[i] );
                            }
                        }
                    }
                }
            }
    
            server.baseSubscribeItem = function( item )
            {
                var server = this;
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
                            this.subscribeDevice( item.device, item.device.mqtt_subscribe_topic );
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
                            item.device.setPublisher( this );
                        }
                        break;
                    default:
                        break;
                }
            }
    
            server.baseUnsubscribeItem = function( item )
            {
                var server = this;
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
                            this.unsubscribeDevice( item.device, item.device.mqtt_subscribe_topic );
                        }
                        break;
                    default: 
                        // console.log( 'Unknown item type [', item.type, ']' );
                        break;
                }
            }
            
            switch( server.type )
            {
                case 'mqtt':
                    // initMqttServer( server );
                    MqttServer.init( server, updateConfiguration, removeHouses, init );
                    break;
                case 'xmpp':
                    // initXmppServer( server, failover );
                    XmppServer.init( server, removeHouses, failover );
                    break;
                default:
                    console.log( 'Unknown server type [', server.type, ']: ', server );
            }                
        }       
    }
})();