#!/usr/bin/env python
import json
import os.path # to check if configuration file exists
import paho.mqtt.client as mqtt  #import the client1
import signal   #to detect CTRL C
import sys
import os, time

class MqttParams( object ):
    """ Holds the mqtt connection params
    """
    def __init__( self, address, port, subscribeTopic, publishTopic ):
        self.address = address
        self.port = port
        self.subscribeTopic = subscribeTopic
        self.publishTopic = publishTopic

class Configuration( object ):
    """ This class implements the handler of house configuration. It publishes the configuration and saves new configuration when received in incoming messages.

    Valid messages:
        {"cmd": "SEND" } : for publishing the current configuration
        {"cmd": "SAVE", "data": "new configuration in json format" } : for saving ne configuration
    """
    ConfigurationFile = 'houses-configuration.json'
    def __init__( self, mqttId, mqttParams ):
        self.mqttParams = mqttParams
        self.mqttId = mqttId
        signal.signal( signal.SIGINT, self.__signalHandler )

    def run( self ):
        #create a mqtt client
        self.client = mqtt.Client( self.mqttId )
        self.client.on_connect = self.__on_connect
        self.client.on_message = self.__on_message
        #set last will and testament before connecting
        self.client.will_set( self.mqttParams.publishTopic, json.dumps({ 'main': 'UNAVAILABLE' }), qos = 1, retain = True )
        self.client.connect( self.mqttParams.address, self.mqttParams.port )
        self.client.loop_start()
        lastModdate = None
        try:
            lastModdate = os.stat( Configuration.ConfigurationFile )[8]
        except Exception, e:
            print( 'Error stating {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )
        #go in infinite loop        
        while( True ):
            time.sleep( 5 )
            try:
                moddate = os.stat( Configuration.ConfigurationFile )[8]
                print( 'last [{}], currrent [{}]'.format( time.ctime( lastModdate ), time.ctime( moddate ) ) )
                if( lastModdate != moddate ):
                    print( '{} has changed. Reading ans resending'.format( Configuration.ConfigurationFile ) )
                    self.__readAndSendConfiguration()
            except Exception, e:
                print( 'Error in infinite loop stating {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )

    def __signalHandler( self, signal, frame ):
        print('Ctrl+C pressed!')
        self.client.disconnect()
        self.client.loop_stop()
        sys.exit(0)        

    def __on_connect( self, client, userdata, flags_dict, result ):
        """Executed when a connection with the mqtt broker has been established
        """
        #debug:
        m = "Connected flags"+str(flags_dict)+"result code " + str(result)+"client1_id  "+str(client)
        print( m )

        # tell other devices that the notifier is available
        self.client.will_set( self.mqttParams.publishTopic, json.dumps({ 'main': 'AVAILABLE' }), qos = 1, retain = True )
        
        #subscribe to start listening for incomming commands
        self.client.subscribe( self.mqttParams.subscribeTopic )

    def __readAndSendConfiguration( self ):
        try:
            with open( Configuration.ConfigurationFile ) as json_file:
                configurationTxt = json.load( json_file )
                print( configurationTxt )
                self.client.publish( self.mqttParams.publishTopic, json.dumps( configurationTxt ), qos = 2, retain = True )
        except Exception, e:
            print( 'Error reading {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )
            pass

    def __on_message( self, client, userdata, message ):
        """Executed when an mqtt arrives
        """
        text = message.payload.decode( "utf-8" )
        print( 'Received message "{}"'.format( text ).encode( 'utf-8' ) )
        if( mqtt.topic_matches_sub( self.mqttParams.subscribeTopic, message.topic ) ):            
            try:
                jsonMessage = json.loads( text )
            except ValueError, e:
                print( '"{}" is not a valid json text, exiting.'.format( text ) )
                return

            try:
                cmd = jsonMessage[ 'cmd' ]
            except Exception, e:
                print( '"{}" is not a valid command. Error:'.format( text, e.message ) )
                return
            if( cmd == 'SEND' ):
                print( 'Will read and send the configuration' )
                self.__readAndSendConfiguration()
            elif( cmd == 'SAVE' ):
                print( 'Will store new configuration in file {}'.format( Configuration.ConfigurationFile ) )
                try:
                    data = jsonMessage[ 'data' ]
                    with open( Configuration.ConfigurationFile, 'w' ) as outfile:
                        json.dump( data, outfile )
                        #publish the new configurationso all subscribers are updated
                        self.client.publish( self.mqttParams.publishTopic, data, qos = 2, retian = True )
                except Exception, e:
                    print( 'Failed saving new configuration. Error: {}'.format( e.message ) )
                    pass


if __name__ == "__main__":
    settingsFile = 'settings.conf'
    if( not os.path.isfile( settingsFile ) ):
        print( 'Settings file "{}" not found, exiting.'.format( settingsFile ) )
        sys.exit()

    with open( settingsFile ) as json_file:
        settings = json.load( json_file )
        print( 'Settings: \n{}'.format( json.dumps( settings, indent = 2  ) ) )
        

        configuration = Configuration( 
            settings['mqttId'],
            MqttParams( settings['mqttParams']['address'], int( settings['mqttParams']['port'] ), settings['mqttParams']['subscribeTopic'], settings['mqttParams']['publishTopic'] )
        )

        configuration.run()