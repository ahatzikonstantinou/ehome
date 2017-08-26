(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Server', Server);

    Server.$inject = [ 'MqttServer', 'XmppServer', 'ServerConnection', 'ServerConfiguration' ];

    function Server( MqttServer, XmppServer, ServerConnection, ServerConfiguration ) {

        return {
            init: init
        };

        function init( server, updateConfiguration, removeConf, removeHouses, failover, connectionDevice, configurationDevice )
        {
            server.connectionStatus = 'DISCONNECTED'; //CONNECTING, CONNECTED            
            
            server.connectionDevice = (typeof connectionDevice !== 'undefined' ) ? connectionDevice : new ServerConnection( server, server.settings.connection.subscribeTopic, server.settings.connection.publishTopic, {} );
            server.connectionDevice.disconnected();
            // console.log( 'server.connectionDevice: ', server.connectionDevice );

            server.configurationDevice = (typeof configurationDevice !== 'undefined' ) ? configurationDevice : new ServerConfiguration( server, server.settings.configuration.subscribeTopic, {}, updateConfiguration );
            
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

            server.setConf = function( configuration, removeExisting )
            {
                if( removeExisting )
                {
                    this.unsubscribeConf();
                    this.removeConf();
                }
                this.conf = configuration;
                if( this.failover )
                {
                    this.failover.setConf( configuration );
                }
            }

            server.baseUnsubscribeConf = function( configuration )
            {
                console.log( 'unsubscribeConf for server: ', this.type );
                for( var i = 0 ; i < configuration.items.length ; i++ )
                {
                    this.baseUnsubscribeItem( server, configuration.items[i] );
                }
                this.baseUnsubscribeHouses( configuration.houses );
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
    
            server.subscribeConf = function()
            {
                for( var i = 0 ; i < this.conf.items.length ; i++ )
                {
                    this.baseSubscribeItem( this.conf.items[i] );
                }

                this.subscribeHouses();
            }

            server.subscribeHouses = function ()
            {
                var houses = this.conf.houses;
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
                if( item.device )
                {
                    if( item.device.mqtt_subscribe_topic )
                    {
                        // console.log( 'Subscribing ', item.device );        
                        this.subscribeDevice( item.device, item.device.mqtt_subscribe_topic );
                    }
                    if( item.device.mqtt_publish_topic )
                    {
                        item.device.setPublisher( this );
                    }
                }
            }
    
            server.baseUnsubscribeItem = function( item )
            {
                var server = this;
                // console.log( '\t\titem:', item );
                if( item.device && item.device.mqtt_subscribe_topic )
                {
                    // console.log( 'Unsubscribing ', item.device, ' from server: ', server.type );
                    this.unsubscribeDevice( item.device, item.device.mqtt_subscribe_topic );
                }
            }
            
            switch( server.type )
            {
                case 'mqtt':
                    // initMqttServer( server );
                    MqttServer.init( server, updateConfiguration, removeConf, removeHouses, init );
                    break;
                case 'xmpp':
                    // initXmppServer( server, failover );
                    XmppServer.init( server, removeConf, removeHouses, failover );
                    break;
                default:
                    console.log( 'Unknown server type [', server.type, ']: ', server );
            }                
        }       
    }
})();