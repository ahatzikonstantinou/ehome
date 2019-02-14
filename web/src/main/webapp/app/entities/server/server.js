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

        function init( server, updateConfiguration, removeConf, removeHouses, failover, primaryServer, connectionDevice, configurationDevice )
        {            
            // console.log( 'Server::init with configurationDevice: ', configurationDevice );
            server.showXmppError = false; //used in order to display a message when xmpp cannot connect
            server.showXmppErrorFn = function( show )
            {
                server.showXmppError = show;
                if( server.isFailover )
                {
                    server.primaryServer.showXmppErrorFn( show );
                }
                console.log( 'Server: server.showXmppError=', server.showXmppError );
            }
            server.getXmmpHost = function()
            {
                if( this.type == 'xmpp' && this.settings.host )
                {
                    return this.settings.host;
                }
                else if( this.failover )
                {
                    return this.failover.getXmmpHost();
                }

                return '';
            }

            server.lastUpdate = null;
            server.connectionStatus = 'DISCONNECTED'; //CONNECTING, CONNECTED            
            
            server.connectionDevice = (typeof connectionDevice !== 'undefined' ) ? connectionDevice : new ServerConnection( server, server.settings.connection.subscribeTopic, server.settings.connection.publishTopic, {} );
            server.connectionDevice.disconnected();
            // console.log( 'server.connectionDevice: ', server.connectionDevice );

            server.configurationDevice = (typeof configurationDevice !== 'undefined' ) ? configurationDevice : new ServerConfiguration( server, server.settings.configuration.subscribeTopic, {}, updateConfiguration );
            
            server.observerDevices = [];
            server.observerDevices.push( server.connectionDevice );
            server.observerDevices.push( server.configurationDevice );

            server.modemObservers = []; // this holds all devices i.e. Sms that need to know which modems are available
            server.addModemObserver = function( observer )
            {
                this.modemObservers.push( observer );
            }
            server.updateModems = function( modems )
            {
                for( var m = 0 ; m < this.modemObservers.length ; m++ )
                {
                    // console.log( 'Server updating modem observer ', this.modemObservers[m], ', modems: ', modems );
                    this.modemObservers[m].updateModems( modems );
                }
            }
            
            server.configurationStatus = 'NOT_SET'; //'UNAVAILABLE'; //AVAILABLE

            server.updateLast = function()
            {
                server.lastUpdate = Date.now();
                if( server.isFailover )
                {
                    server.primaryServer.updateLast();
                }
            }

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
                    if( item.device.mqtt_publish_topic )
                    {
                        // console.log( 'Subscribing ', item.device );        
                        this.subscribeDevice( item.device, item.device.mqtt_publish_topic );
                    }
                    if( item.device.mqtt_subscribe_topic )
                    {
                        item.device.setPublisher( this );
                    }
                    if( item.device.setModemUpdater )   // devices such as Sms
                    {
                        console.log( 'Device ', item.device, ' is a modem observer' );
                        item.device.setModemUpdater( this );
                    }
                    if( item.device.addModemObserver )  // devices such as Modem
                    {
                        console.log( 'Device ', item.device, ' is a modem updater' );
                        item.device.addModemObserver( this );
                    }
                }
            }
    
            server.baseUnsubscribeItem = function( item )
            {
                var server = this;
                // console.log( '\t\titem:', item );
                if( item.device && item.device.mqtt_publish_topic )
                {
                    // console.log( 'Unsubscribing ', item.device, ' from server: ', server.type );
                    this.unsubscribeDevice( item.device, item.device.mqtt_publish_topic );
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
                    XmppServer.init( server, removeConf, removeHouses, primaryServer, failover );
                    break;
                default:
                    console.log( 'Unknown server type [', server.type, ']: ', server );
            }                
        }       
    }
})();