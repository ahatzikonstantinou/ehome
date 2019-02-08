#!/usr/bin/env python
import json
import os.path # to check if configuration file exists
import paho.mqtt.client as mqtt  #import the client1
import signal   #to detect CTRL C
import sys
import os, time
from datetime import datetime

class MqttParams( object ):
    """ Holds the mqtt connection params
    """
    def __init__( self, address, port, subscribeTopic, publishTopic, reportTopic, reportIntervalSeconds ):
        self.address = address
        self.port = port
        self.subscribeTopic = subscribeTopic
        self.publishTopic = publishTopic
        self.reportTopic = reportTopic
        self.reportIntervalSeconds = reportIntervalSeconds

class Configuration( object ):
    """ This class implements the handler of house configuration. It publishes the configuration and saves new configuration when received in incoming messages.

    Valid messages:
        {"cmd": "SEND" } : for publishing the current configuration
        {"cmd": "SAVE", "data": "new configuration in json format" } : for saving new configuration
        {"cmd": "ITEM_UPDATE", "data": "new item configuration in json format" } : for updating or adding new item
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
        self.client.will_set( self.mqttParams.publishTopic, json.dumps({ 'main': 'UNAVAILABLE' }), qos = 2, retain = True )
        self.client.connect( self.mqttParams.address, self.mqttParams.port )
        self.client.loop_start()
        lastModdate = None
        lastReport = datetime.now()
        try:
            lastModdate = os.stat( Configuration.ConfigurationFile )[8]
        except Exception, e:
            print( 'Error stating {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )
        #go in infinite loop        
        while( True ):
            time.sleep( 5 )
            try:
                moddate = os.stat( Configuration.ConfigurationFile )[8]
                # print( 'last [{}], currrent [{}]'.format( time.ctime( lastModdate ), time.ctime( moddate ) ) )
                if( lastModdate != moddate ):
                    print( '{} has changed. Reading and resending'.format( Configuration.ConfigurationFile ) )
                    self.__readAndSendConfiguration()
                    lastModdate = moddate

                now = datetime.now()
                lapsed = now - lastReport 
                if( lapsed .total_seconds() > self.mqttParams.reportIntervalSeconds ):
                    print( 'Publishing configuration report request' )
                    lastReport = now
                    self.client.publish( self.mqttParams.reportTopic, "", qos = 2, retain = False )

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
        self.client.publish( self.mqttParams.reportTopic, "", qos = 2, retain = False )
        
        #subscribe to start listening for incomming commands
        self.client.subscribe( self.mqttParams.subscribeTopic )

    def __readAndSendConfiguration( self ):
        try:
            with open( Configuration.ConfigurationFile ) as json_file:
                configurationTxt = json.load( json_file )
                print( json.dumps( configurationTxt, ensure_ascii=False, encoding='utf8' ).encode( 'utf-8' ) )
                self.client.publish( self.mqttParams.publishTopic, json.dumps( configurationTxt ), qos = 2, retain = False )
        except Exception, e:
            print( 'Error reading {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )
            pass

    def __on_message( self, client, userdata, message ):
        """Executed when an mqtt arrives
        """
        text = message.payload  #.decode( "utf-8" )
        print( 'Received message "{}"'.format( text ) ) #.encode( 'utf-8' ) )
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
                        self.client.publish( self.mqttParams.publishTopic, data, qos = 2, retain = False )
                except Exception, e:
                    print( 'Failed saving new configuration. Error: {}'.format( e.message ) )
                    pass
            elif( cmd == 'ITEM_UPDATE' ):
                print( 'Will update an item' )
                try:
                    data = jsonMessage[ 'data' ]
                    # print( 'item data: {}'.format( data ) )
                    # will try to find an item with the same id at the specified location and update it or add it if not found
                    try:
                        with open( Configuration.ConfigurationFile, 'r' ) as json_file:
                            configuration = json.load( json_file )
                    except Exception, e:
                        print( 'Error reading {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )
                        pass

                    print( 'location="{}"'.format( data[ 'location' ] ) )
                    configurationNode = self.__locateConfigurationNode( data[ 'location' ], configuration )
                    # print( 'Located node: {}'.format( configurationNode ) )
                    if( configurationNode is not None ):
                        changed = self.__updateItem( data, configurationNode )
                        if( changed ):
                            # print( 'Configuration now: {}'.format( configuration ) )
                            print( 'Will store updated configuration in file {}'.format( Configuration.ConfigurationFile ) )
                            try:
                                with open( Configuration.ConfigurationFile, 'w' ) as outfile:
                                    text = json.dumps( configuration, indent = 4, ensure_ascii=False, encoding='utf8' )
                                    outfile.write( text.encode( 'utf-8' ) )
                                    # json.dump( configuration, outfile, indent = 4, ensure_ascii=False )
                                    #the new configuration will be published in the next stat check of the file      
                            except Exception, e:
                                print( 'Failed saving updated configuration. Error: {}'.format( e.message ) )
                                pass
                    else:
                        print ( 'Location "{}" not found in configuration' )

                except Exception, e:
                    print( 'Failed updating item. Error: {}'.format( e.message ) )
                    pass
    
    def __updateItem( self, item, configurationNode ):
        # print( 'Configuration node: {}'.format( configurationNode ) )
        # print( 'item: {}'.format( item ) )
        found = False
        changed = False
        for i in range( 0, len( configurationNode [ 'items' ] ) ):
            if( configurationNode [ 'items' ][i][ 'id' ] == item[ 'id' ] ):
                found = True
                if( json.dumps( configurationNode[ 'items' ][i] ) != json.dumps( item ) ):
                    print( 'item {} is different, updating...'.format( item['id'] ) )
                    configurationNode[ 'items' ][i] = item
                    changed = True
                else:
                    print( 'item {} is same, skipping...'.format( item['id'] ) )
                break
        
        if( not found ):
            print( 'item {} not found, adding...'.format( item['id'] ) )
            configurationNode[ 'items' ].append( item )
            changed = True

        return changed


    def __locateConfigurationNode( self, location, configuration ):        
        if( not location.strip() ):
            return configuration[ 'items' ]

        node = configuration
        sections = location.split( "/" )
        # print( 'sections: ', sections )
        house = sections[0]
        # print( 'searching for house {}'.format( house ) )
        if( len( house ) > 0 ):
            houseConf = self.__findInConfiguration( house, 'houses', configuration, 'mqtt' )
            if( houseConf is not None ):
                node = houseConf
                floor = sections[1]
                # print( 'floor: {}', floor )
                if( len( floor ) > 0 ):
                    floorConf = self.__findInConfiguration( floor, 'floors', houseConf, 'mqtt' )
                    node = floorConf
                    room = sections[2]
                    if( len( room ) > 0 ):
                        roomConf = self.__findInConfiguration( room, 'rooms', floorConf, 'mqtt' )
                        node = roomConf
        return node

    def __findInConfiguration( self, mqtt, entity, configuration, tag ):
        configurationSection = configuration
        if( entity is not None ):
            if( not entity in configuration ):
                return None
            else:
                # print( 'Will search for entity {} in {}'.format( entity, configuration ) )
                configurationSection = configuration[ entity ]

        # print( 'will try to find {} == {} in {}'. format( tag, mqtt, configurationSection ) )
        for i in range( 0, len( configurationSection ) ):
            # print( 'Trying configurationSection[ {} ][ {} ] = {}'.format( i, tag, configurationSection[ i ][ tag ] ) )
            # print( 'tag in configurationSection[i] = {}'.format( tag in configurationSection[i] ) )
            # print( 'configurationSection[ i ][ tag ] == mqtt = {}'.format( configurationSection[ i ][ tag ] == mqtt ) )
            if( tag in configurationSection[i] and configurationSection[ i ][ tag ] == mqtt ):
                print( 'Found {}'.format( mqtt ) )
                return configurationSection[ i ]
        
        return None


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
            MqttParams( settings['mqttParams']['address'], int( settings['mqttParams']['port'] ), settings['mqttParams']['subscribeTopic'], settings['mqttParams']['publishTopic'], settings['mqttParams']['reportTopic'], settings['mqttParams']['reportIntervalSeconds'] )
        )

        configuration.run()