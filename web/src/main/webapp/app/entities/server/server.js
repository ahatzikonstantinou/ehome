(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Server', Server);

    Server.$inject = [ '$interval', 'MqttServer', 'XmppServer', 'ServerConnection', 'ServerConfiguration' ];

    function Server( $interval, MqttServer, XmppServer, ServerConnection, ServerConfiguration ) {

        return {
            init: init
        };

        function init( server, updateConfiguration, removeConf, failover, primaryServer, connectionDevice, configurationDevice )
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
            
            server.connectionDevice = (typeof connectionDevice !== 'undefined' ) ? connectionDevice : new ServerConnection( server, server.settings.connection.publishTopic, server.settings.connection.subscribeTopic, {}, server.scope );
            server.connectionDevice.disconnected();
            // console.log( 'server.connectionDevice: ', server.connectionDevice );

            server.configurationDevice = (typeof configurationDevice !== 'undefined' ) ? configurationDevice : new ServerConfiguration( server, server.settings.configuration.publishTopic, server.settings.configuration.subscribeTopic, {}, updateConfiguration, server.scope );
            server.configurationDevice.initFromLocalStorage();           
            
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
                console.log( 'baseUnsubscribeConf for server: ', this.type );
                // for( var i = 0 ; i < configuration.items.length ; i++ )
                // {
                //     this.baseUnsubscribeItem( server, configuration.items[i] );
                // }
                // this.baseUnsubscribeHouses( configuration.houses );

                this.baseUnsubscribeContainer( configuration.container );
            }

            server.baseUnsubscribeContainer = function( container )
            {
                // console.log( 'unsubscribing container ', container );
                if( container.items )
                {
                    for( var i = 0 ; i < container.items.length ; i++ )
                    {
                        this.baseUnsubscribeItem( container.items[i] );
                    }
                }
                if( container.containers )
                {
                    for( var c = 0 ; c < container.containers.length ; c++ )
                    {
                        this.baseUnsubscribeContainer( container.containers[c] );
                    }
                }
            }

            server.subscribeConf = function()
            {                
                this.subscribeContainer( this.conf.container );
            }

            server.subscribeContainer = function( container )
            {
                if( !container )
                {
                    return;
                }

                // console.log( 'subscribing container: ', container );
                if( container.items )
                {
                    // console.log( 'subscribing container items: ' );
                    for( var i = 0 ; i < container.items.length ; i++ )
                    {
                        if( 'mqtt' == container.items[i].protocol )
                        {
                            this.baseSubscribeItem( container.items[i] );
                        }
                    }
                }
                if( container.containers )
                {
                    for( var c = 0 ; c < container.containers.length ; c++ )
                    {
                        this.subscribeContainer( container.containers[c] );
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
                        // console.log( 'Settings publisher ', this );
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

            server.baseStopCheckIntervals = function()
            {
                if( server.connectionCheckInterval )
                {
                    $interval.cancel( server.connectionCheckInterval );
                }
                if( server.configurationCheckInterval )
                {
                    $interval.cancel( server.configurationCheckInterval );
                }
            }
            
            switch( server.type )
            {
                case 'mqtt':
                    // initMqttServer( server );
                    MqttServer.init( server, updateConfiguration, removeConf, init );
                    break;
                case 'xmpp':
                    // initXmppServer( server, failover );
                    XmppServer.init( server, removeConf, primaryServer, failover );
                    break;
                default:
                    console.log( 'Unknown server type [', server.type, ']: ', server );
            }                           
            
            return this;
        }       
    }
})();