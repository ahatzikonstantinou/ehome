#!/usr/bin/env python
import json
import os.path # to check if configuration file exists
import paho.mqtt.client as mqtt  #import the client1
import signal   #to detect CTRL C
import sys
import os, time
from datetime import datetime, timedelta
from HTMLParser import HTMLParser
import re
import traceback

#use import logging instead for full logging
from pprint import pprint

class MqttParams( object ):
    """ Holds the mqtt connection params
    """
    def __init__( self, address, port, subscribeTopic, publishTopic, reportTopic, reportIntervalSeconds, defaultItemExpirationSeconds ):
        self.address = address
        self.port = port
        self.subscribeTopic = subscribeTopic
        self.publishTopic = publishTopic
        self.reportTopic = reportTopic
        self.reportIntervalSeconds = reportIntervalSeconds
        self.defaultItemExpirationSeconds = defaultItemExpirationSeconds

class ExpiringItem( object ):
    """ Holds items form configuration nodes, so that their expirationmay be monitored
    """
    def __init__( self, item, lastPresenceTime ):
        self.item = item
        self.lastPresenceTime = lastPresenceTime

class Configuration( object ):
    """ This class implements the handler of house configuration. It publishes the configuration and saves new configuration when received in incoming messages.

    Valid messages:
        {"cmd": "SEND" } : for publishing the current configuration
        {"cmd": "SAVE", "data": "new configuration in json format" } : for saving new configuration
        {"cmd": "ITEM_UPDATE", "data": "new item configuration in json format" } : for updating or adding new item
        {"cmd": "DELETE_EXPIRED_ITEMS", "expiration": "days:hours:minutes:seconds" } : for deleting items
    """
    ConfigurationFile = 'houses-configuration.json'
    def __init__( self, mqttId, mqttParams ):
        self.mqttParams = mqttParams
        self.mqttId = mqttId
        self.expirationItemList = []
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
        now = datetime.now()
        lastReport = now
        lastExpirationCheck = now
        try:
            lastModdate = os.stat( os.path.dirname(os.path.abspath(__file__) ) + '/' + Configuration.ConfigurationFile )[8]
            self.__readAndSendConfiguration()
        except Exception, e:
            print( 'Error stating {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )
        #go in infinite loop        
        while( True ):
            time.sleep( 5 )
            try:
                moddate = os.stat( os.path.dirname(os.path.abspath(__file__) ) + '/' + Configuration.ConfigurationFile )[8]
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
                    self.client.publish( self.mqttParams.reportTopic, "", qos = 0, retain = False )

                if( ( now - lastExpirationCheck ).total_seconds() > self.mqttParams.defaultItemExpirationSeconds ):
                    # print( 'Checking items for expiration' )
                    for i in range(0, len( self.expirationItemList ) ):
                        if( 'publish' in self.expirationItemList[i].item ):
                            msg = '{{"id": "{}", "state": "offline"}}'.format( self.expirationItemList[i].item[ 'id' ] )
                            self.client.publish( self.expirationItemList[i].item[ 'publish' ], msg )
                            print( 'sending expiration message {}, topic: {}'.format( msg, self.expirationItemList[i].item['publish'] ) )

            except Exception, e:
                print( 'Error in infinite loop. Error: {}'.format( traceback.format_exc() ) )                

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
        self.client.publish( self.mqttParams.reportTopic, "", qos = 0, retain = False )
        
        #subscribe to start listening for incomming commands
        self.client.subscribe( self.mqttParams.subscribeTopic )

    def __readAndSendConfiguration( self ):
        try:
            with open( os.path.dirname( os.path.abspath(__file__) ) + '/' + Configuration.ConfigurationFile ) as json_file:
                configurationTxt = json.load( json_file )
                print( json.dumps( configurationTxt, ensure_ascii=False, encoding='utf8' ).encode( 'utf-8' ) )
                self.client.publish( self.mqttParams.publishTopic, json.dumps( configurationTxt ), qos = 2, retain = False )

                # remove old subscriptions and subcribe to publish topics of items in the new configuration
                for i in range( 0, len( self.expirationItemList ) ):
                    if( 'publish' in self.expirationItemList[i].item ):
                        self.client.unsubscribe( self.expirationItemList[i].item[ 'publish' ] )
                        print( 'unsubscribed from {}, topic: {}'.format(self.expirationItemList[i].item['name'].encode( 'utf-8' ), self.expirationItemList[i].item['publish'].encode( 'utf-8' ) ) )
                self.expirationItemList = []
                self.__loadExpirationItems( configurationTxt, datetime.now() )
                print( 'Expiration list: ' );
                for i in range( 0, len( self.expirationItemList ) ):
                    if( 'publish' in self.expirationItemList[i].item ):
                        self.client.subscribe( self.expirationItemList[i].item[ 'publish' ] )
                        print( 'new subscripton to {}, topic: {}'.format(self.expirationItemList[i].item['name'].encode( 'utf-8' ), self.expirationItemList[i].item['publish'].encode( 'utf-8' ) ) )
        except Exception, e:
            print( 'Error reading {}. Error: {}'.format( Configuration.ConfigurationFile, traceback.format_exc() ) )
            pass

    def __loadExpirationItems( self, node, now ):
        # print( 'loadExpiration: {}'.format( type( node ) ) )
        nodeType = type( node ) 
        if( nodeType is dict ):
            for tag, child in node.items():
                # print( '  trying tag "{}"'.format( tag ) )
                if( tag == 'items' ):
                    for i in range( 0, len( node[ 'items' ] ) ):
                        # print( '  adding item [{}]'.format( node[ 'items' ][i] ) )
                        if( 'id' in node[ 'items' ][i] ):
                            self.expirationItemList.append( ExpiringItem( node[ 'items' ][i], now ) )
                else:
                    if( len( node[ tag ] ) > 0 ):
                        self.__loadExpirationItems( node[ tag ], now )
        elif( nodeType is list ):
            for i in range( 0, len( node ) ):
                self.__loadExpirationItems( node[i], now )

    def __itemIsExpired( self, id, now, expirationTimedelta ):
        i = [ i for i in self.expirationItemList if i.item['id'] == id ]
        if( len( i ) != 1 ):
            return False
        
        i = i[0]
        return ( now - i.lastPresenceTime ).total_seconds() > expirationTimedelta.total_seconds()

    def __deleteExpiredItems( self, node, now, expirationTimedelta ):
        # print( '__deleteExpiredItems:' )
        nodeType = type( node ) 
        if( nodeType is dict ):
            for tag, child in node.items():
                print( '  trying tag "{}"'.format( tag ) )
                if( tag == 'items' ):
                    deleted = [ d for d in node[ 'items' ] if self.__itemIsExpired( d['id'], now, expirationTimedelta ) ]
                    node[ 'items' ][:] = [ ni for ni in node['items'] if ni['id'] not in [ d['id'] for d in deleted ] ]
                    for i in range( 0, len( deleted ) ):
                        print( 'Deleting {} from configuration and expirationList'.format( deleted[i]['id'] ) )
                        if( 'publish' in deleted[i] ):
                            print( 'Unsubscrubing from {}'.format( deleted[i]['publish'].encode( 'utf-8' ) ) )
                    self.expirationItemList[:] = [ x for x in self.expirationItemList if x.item['id'] not in [ d['id'] for d in deleted ] ]
                else:
                    if( len( node[ tag ] ) > 0 ):
                        self.__deleteExpiredItems( node[ tag ], now, expirationTimedelta )
        elif( nodeType is list ):
            for i in range( 0, len( node ) ):
                self.__deleteExpiredItems( node[i], now, expirationTimedelta )


    def __on_message( self, client, userdata, message ):
        """Executed when an mqtt arrives
        """
        h = HTMLParser()
        text = h.unescape( message.payload ) #.decode( "utf-8" )        
        print( 'Received message "{}"'.format( text.encode( 'utf-8' ) ) )
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
                    with open( os.path.dirname(os.path.abspath(__file__) ) + '/' + Configuration.ConfigurationFile, 'w' ) as outfile:
                        json.dump( data, outfile )
                        #publish the new configurationso all subscribers are updated
                        self.client.publish( self.mqttParams.publishTopic, data, qos = 2, retain = False )
                except Exception, e:
                    print( 'Failed saving new configuration. Error: {}'.format( e.message ) )
                    pass
            elif( cmd == 'DELETE_EXPIRED_ITEMS' ):
                if( not 'expiration' in jsonMessage ):
                    print( 'Error no expiration field in message [{}]'.format( json.dumps( jsonMessage, ensure_ascii=False, encoding='utf8' ).encode( 'utf-8' ) ) )
                    return

                if( not re.match( r"[0-9]*:[0-9]*:[0-9]*:[0-9]*", jsonMessage[ 'expiration' ] ) ):
                    print( 'Wrong expiration [{}]'.format( jsonMessage[ 'expiration' ] ) )
                    return

                days, hours, minutes, seconds = jsonMessage[ 'expiration' ].split( ':' )
                print( 'Will delete items expiring after {} days, {} hours, {} minutes, {} seconds'.format( days, hours, minutes, seconds ) )
                expirationTimedelta = timedelta( days = int( days ), hours = int( hours ), minutes = int( minutes ), seconds = int( seconds ) ) 
                try:
                    with open( os.path.dirname( os.path.abspath(__file__) ) + '/' + Configuration.ConfigurationFile ) as json_file:
                        configurationTxt = json.load( json_file )                    
                    self.__deleteExpiredItems( configurationTxt, datetime.now(), expirationTimedelta )
                except Exception, e:
                    print( 'Error deleting items. Error: {}'.format( traceback.format_exc() ) )
                    pass
                
                #ask devices to send in configuration reports
                self.client.publish( self.mqttParams.reportTopic, "", qos = 0, retain = False )
                print( 'After delete Will store updated configuration in file {}'.format( Configuration.ConfigurationFile ) )
                try:
                    with open( os.path.dirname(os.path.abspath(__file__)) + '/' + Configuration.ConfigurationFile, 'w' ) as outfile:
                        text = json.dumps( configurationTxt, indent = 4, ensure_ascii=False, encoding='utf8' )
                        print( 'Configuration after delete:\n{}'.format( text.encode( 'utf-8' ) ) )
                        outfile.write( text.encode( 'utf-8' ) )
                        
                        #the new configuration will be published in the next stat check of the file
                except Exception, e:
                    print( 'Failed saving updated configuration. Error: {}'.format( e.message ) )
                    pass
            elif( cmd == 'ITEM_UPDATE' ):
                print( 'Will update an item' )
                try:
                    data = jsonMessage[ 'data' ]
                    # print( 'item data: {}'.format( data ) )
                    # will try to find an item with the same id at the specified location and update it or add it if not found
                    try:
                        with open( os.path.dirname(os.path.abspath(__file__) ) + '/' + Configuration.ConfigurationFile, 'r' ) as json_file:
                            configuration = json.load( json_file )
                    except Exception, e:
                        print( 'Error reading {}. Error: {}'.format( Configuration.ConfigurationFile, e.message ) )
                        pass

                    print( 'location="{}"'.format( data[ 'location' ] ) )
                    locationFinder = self.LocationFinder()
                    self.__locateConfigurationNode( 'mqtt', ( "/" + data[ 'location' ].strip() ).split( "/" ), 0, configuration, locationFinder )
                    # print( 'Located node: {}'.format( configurationNode ) )
                    if( locationFinder.node is not None ):
                        changed = self.__updateItem( data, locationFinder.node )
                        if( changed ):
                            # print( 'Configuration now: {}'.format( configuration ) )
                            print( 'Will store updated configuration in file {}'.format( Configuration.ConfigurationFile ) )
                            try:
                                with open( os.path.dirname(os.path.abspath(__file__)) + '/' + Configuration.ConfigurationFile, 'w' ) as outfile:
                                    text = json.dumps( configuration, indent = 4, ensure_ascii=False, encoding='utf8' )
                                    outfile.write( text.encode( 'utf-8' ) )
                                    # json.dump( configuration, outfile, indent = 4, ensure_ascii=False )
                                    #the new configuration will be published in the next stat check of the file   
                            except Exception, e:
                                print( 'Failed saving updated configuration. Error: {}'.format( e.message ) )
                                pass
                    else:
                        print ( 'Location "{}" not found in configuration'.format( data[ 'location' ] ) )

                except Exception, e:
                    print( 'Failed updating item. Error: {}'.format( e.message ) )
                    pass        
        else:
            #other messages may be published by the items that have sent in ITEM_UPDATE messages
            #because we are subscribing to the publish topics of all expiring items in configuration and from ITEM_UPDATE
            try:
                jsonMessage = json.loads( text )
                if( ( ( not 'state' in jsonMessage ) or jsonMessage['state'].lower() != 'offline' ) and
                    'id' in jsonMessage 
                ):                
                    self.__refreshExpiringItem( jsonMessage['id'] )
            except ValueError, e:
                print( '"{}" is not a valid json text, exiting.'.format( text ) )
                return

    def __refreshExpiringItem( self, itemId ):
        for i in range( 0, len( self.expirationItemList ) ):
            if( self.expirationItemList[i].item['id'] == itemId ):
                print( 'refreshing item id: {}'.format( itemId ) )
                self.expirationItemList[i].lastPresenceTime = datetime.now()
                break

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
                    self.client.unsubscribe( item[ 'publish' ] )
                    changed = True
                else:
                    print( 'item {} is same, skipping...'.format( item['id'] ) )
                break
        
        if( not found ):
            print( 'item {} not found, adding...'.format( item['id'] ) )
            configurationNode[ 'items' ].append( item )
            changed = True

        if( changed ):
            self.client.subscribe( item[ 'publish' ] )
        return changed

    class LocationFinder( object ):
        def __init__( self ):
            self.foundLocation = False
            self.finished = False
            self.node = None
        def search( self, locationTag, locations, currenLocationIndex, configurationNode ):
            #special case: the first node of the configuration does not have locationTag and an empty location
            #is considered a match
            if( currenLocationIndex == 0 and 
                ( not locations[0].strip() ) and 
                type( configurationNode ) is dict and 
                locationTag not in configurationNode 
            ):
                self.foundLocation = True
                self.finished = len( locations ) == 0
                if( self.finished ):
                    self.node = configurationNode
                return
                
            self.foundLocation = type( configurationNode ) is dict and \
                locationTag in configurationNode and \
                configurationNode[ locationTag ] == locations[ currenLocationIndex ]             
                
            if( self.foundLocation and ( currenLocationIndex + 1 == len( locations ) ) ):
                self.finished = True
                self.node = configurationNode

    def __locateConfigurationNode( self, locationTag, locations, currenLocationIndex, configurationNode, locationFinder ):
        if( locationFinder.finished ):
            return True
        
        nodeType = type( configurationNode )
        if( nodeType is dict ):
            locationFinder.search( locationTag, locations, currenLocationIndex, configurationNode )
            if( locationFinder.finished ):
                #found node
                return True
            elif( locationFinder.foundLocation ):
                #found location but not final node yet, search the rest of the node's children
                for key in configurationNode:
                    if( self.__locateConfigurationNode( locationTag, locations, currenLocationIndex + 1, configurationNode[ key ], locationFinder ) ):
                        return True
            #locationFinder did not finish and did not even find the requested location
            return False
        elif( nodeType is list ):
            for i in range( 0, len( configurationNode ) ):
                locationFinder.search( locationTag, locations, currenLocationIndex, configurationNode[i] )
                if( locationFinder.finished ):
                    #found node
                    return True
                elif( locationFinder.foundLocation ):
                    #found location but not final node yet, search the rest of the node's children
                    if( self.__locateConfigurationNode( locationTag, locations, currenLocationIndex, configurationNode[i], locationFinder ) ):
                        return True
            #None of the list items were a correct location that lead to the target node
            return False

   
if __name__ == "__main__":
    settingsFile =  os.path.dirname(os.path.abspath(__file__)) + '/settings.conf'
    if( not os.path.isfile( settingsFile ) ):
        print( 'Settings file "{}" not found, exiting.'.format( settingsFile ) )
        sys.exit()

    with open( settingsFile ) as json_file:
        settings = json.load( json_file )
        print( 'Settings: \n{}'.format( json.dumps( settings, indent = 2  ) ) )
        

        configuration = Configuration( 
            settings['mqttId'],
            MqttParams( settings['mqttParams']['address'], int( settings['mqttParams']['port'] ), settings['mqttParams']['subscribeTopic'], settings['mqttParams']['publishTopic'], settings['mqttParams']['reportTopic'], settings['mqttParams']['reportIntervalSeconds'], settings['mqttParams']['defaultItemExpirationSeconds'] )
        )

        configuration.run()