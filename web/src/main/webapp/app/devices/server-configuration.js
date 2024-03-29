(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory( 'ServerConfiguration', ServerConfiguration );

    ServerConfiguration.$inject = [ 'Configuration' ];

    function ServerConfiguration( Configuration ) {
        //Constructor
        function ServerConfiguration( server, mqtt_publish_topic, mqtt_subscribe_topic, state, guiUpdateCb, scope )
        {
            MqttDevice.call( this, mqtt_publish_topic, state, scope, mqtt_subscribe_topic );
            this.server = server;
            this.status = 'NOT_SET'; //'UNAVAILABLE'; //SUCCESS, ERROR
            this.subscribed = false;
            this.guiUpdateCb = guiUpdateCb;
        }
        
        ServerConfiguration.prototype = Object.create( MqttDevice.prototype );
        ServerConfiguration.prototype.constructor = ServerConfiguration;
        
        ServerConfiguration.prototype.initFromLocalStorage= function()
        {
            // attempt to initialise with last saved configuration
            var configurationString = localStorage.getItem( 'configuration_' + this.server.id );
            if( configurationString )
            {
                this.server.confString = configurationString; 
                

                console.log( 'Before init unsubscribe previous configuration' );
                if( this.server.connectionStatus == 'CONNECTED' )
                {
                    this.server.unsubscribeConf();  // unsubscribe previous configuration
                }
                else
                {
                    console.log( ' ... but the server is not connected, unsubscribing cancelled' );
                }
                
                this.subscribed = false;
                console.log( "attempting to initialize with last saved configuration: ", configurationString );
                this.server.conf = Configuration.generateList( angular.fromJson( configurationString ), this.scope );

                // Configuration.generateList will start all containers collapsed, but it is nicer if the top
                // container which is more like a placeholder to be expanded
                this.server.conf.container.gui.collapsed = false;

                this.guiUpdateCb( this.server, this.server.conf );
                this.status = 'SUCCESS';

                console.log( 'At the end of init attempting to subscribe new configuration' );
                if( this.server.connectionStatus == 'CONNECTED' )
                {
                    this.subscribe();
                }
                else
                {
                    console.log( ' ... but the server is not connected, subscribing cancelled' );
                }
            }

        }
        
        ServerConfiguration.prototype.subscribe = function()
        {            
            console.log( 'subscribing new configuration' );
            this.server.subscribeConf();
            this.subscribed = true;
        }

        ServerConfiguration.prototype.update = function( topic, message )
        {
            if( topic == this.mqtt_subscribe_topic )
            {
                try
                {
                    // nothing to do if configuration has not changed
                    if( this.server.confString == message )
                    {
                        console.log( 'New configuration is same as current, nothing to do...' );
                        this.status = 'SUCCESS';
                        // Check for conf and container because we might have started and keep operating without
                        // a configuration server, therefore the messages we are recieving are retained last will
                        // message "{main: "UNAVAILABLE"}"
                        if( !this.subscribed && this.server.conf && this.server.conf.container )
                        {
                            console.log( "but will subscribe existing configuration" );
                            this.subscribe();
                        }
                        return;
                    }

                    // console.log( 'current configuration != new.\nCurrent: ', this.server.confString, '\nNew: ', message );
                    this.server.confString = message;                    
                    
                    var data = angular.fromJson( message );
                    console.log( 'ServerConfiguration data: ',  data );
                    this.state = data;
                    this.lastUpdate = Date.now();
                    if( typeof data.main !== 'undefined' )
                    {
                        this.status = data.main;
                    }
                    else
                    {
                        console.log( 'unsubscribe previous configuration' );
                        this.server.unsubscribeConf();  // unsubscribe previous configuration
            
                        console.log( 'setting new configuration to server' );
                        this.server.conf = Configuration.generateList( data, this.scope );

                        this.guiUpdateCb( this.server, this.server.conf );
                        this.status = 'SUCCESS';

                        console.log( 'saving new configuration' );
                        this.saveToLocalStorage( message );

                        this.subscribe();
                    }                    
                }
                catch( error )
                {
                    this.status = 'ERROR';
                    console.error( error );
                }
            }
        }

        ServerConfiguration.prototype.refresh = function()
        {
            console.log( 'ServerConfiguration will send message to topic ', this.mqtt_publish_topic );
            if( this.publisher )
            {
                var message = new Paho.MQTT.Message( '{"cmd": "SEND" }' );
                message.destinationName = this.mqtt_publish_topic ;
                console.log( 'ServerConfiguration sending message: ', message.payloadString );
                this.publisher.send( message );
            }
        }

        ServerConfiguration.prototype.saveToLocalStorage = function( text )
        {
            try
            {
                console.log( 'saving to localStorage' );
                localStorage.setItem('configuration_' + this.server.id, text ); 
                localStorage.setItem('configurationLastUpdate_' + this.server.id, this.lastUpdate ); 
            }
            catch( error )
            {
                console.error( error );
            }
        }

        ServerConfiguration.prototype.deleteFromLocalStorage = function()
        {
            try
            {
                console.log( 'Deleting from localStorage' );
                localStorage.removeItem('configuration_' + this.server.id ); 
                localStorage.removeItem('configurationLastUpdate_' + this.server.id ); 

            }
            catch( error )
            {
                console.error( error );
            }
        }

        return ServerConfiguration;
    }
})();
