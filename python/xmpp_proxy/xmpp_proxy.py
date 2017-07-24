#!/usr/bin/env python
import paho.mqtt.client as mqtt  #import the client1
import signal   #to detect CTRL C
import sys,xmpp
import time
import json #to generate payloads for mqtt publishing
import os.path # to check if configuration file exists
import base64
import Queue
import threading
import zlib
import bz2

class MqttParams( object ):
    """ Holds the mqtt connection params
    """
    def __init__( self, address, port ):
        self.address = address
        self.port = port

class XmppParams( object ):
    """ Holds the xmpp connection params
    """
    def __init__( self, jid, password, server, port, authorizedRemoteJids ):
        self.jid = jid
        self.password = password
        self.server = server
        self.port = port
        self.authorizedRemoteJids = authorizedRemoteJids

class Subscriptions( object ):
    def __init__( self ):
        self._subscriptions = {}

    def add( self, subscription, jid ):
        if( subscription not in self._subscriptions ):
            self._subscriptions[ subscription ] = [ jid ]
        else:
            if( jid not in self._subscriptions[ subscription ] ):
                self._subscriptions[ subscription ].append( jid )

    def remove( self, subscription, jid ):
        if( subscription not in self._subscriptions ):
            return

        if( jid not in self._subscriptions[ subscription ] ):
            return

        self._subscriptions[ subscription ].remove( jid )

        if( len( self._subscriptions[ subscription ] ) ):
            self._subscriptions.pop( subscription, None )

    def contains( self, subscription ):
        return subscription in self._subscriptions

    def jids( self, subscription ):
        if( subscription not in self._subscriptions ):
            return []

        return self._subscriptions[ subscription ]

class XmppProxy( object ):
    """ This class handles notifications such as phonecalls, sms, email and IM
    """
    def __init__( self, mqttId, mqttParams, xmppParams ):        
        self.mqttParams = mqttParams
        self.mqttId = mqttId
        self.xmppParams = xmppParams
        self.mqttClient = None
        self.xmppClient = None
        self.jid = None
        self._subscriptions = Subscriptions()
        self.xmppQueue = Queue.Queue()  # contains mqtt messages to be sent away 
        self.mqttQueue = Queue.Queue()  # contains mqtt messages to be sent to the internal mqtt network

        signal.signal( signal.SIGINT, self.__signalHandler )

    def run( self ):
        #create a mqtt client
        # self.mqttClient = mqtt.Client( self.mqttId )
        # self.mqttClient.on_connect = self.__on_mqttConnect
        # self.mqttClient.on_message = self.__on_mqttMessage
        # self.mqttClient.connect( self.mqttParams.address, self.mqttParams.port )
        # self.mqttClient.loop_start()
        
        t = threading.Thread( target = self.__mqttConnect, args = ( self.xmppQueue, self.mqttQueue ) )
        t.daemon = True
        t.start()

        #create xmpp client
        # self.jid = xmpp.protocol.JID( self.xmppParams.jid )
        # self.xmppClient = xmpp.Client( self.jid.getDomain(), debug=[] )      
  
        # self.__xmppConnect()
        t = threading.Thread(target=self.__xmppConnect, args = ( self.xmppQueue, self.mqttQueue ) )
        t.daemon = True
        t.start()
        # self.xmppClient = sleekxmpp.ClientXMPP( self.xmppParams.jid, self.xmppParams.password )
        # self.xmppClient.add_event_handler("session_start", self.start)
        # self.xmppClient.add_event_handler("message", self.message)
        # self.xmppClient.connect()
        # self.xmppClient.process( threaded = True )

        # socketlist = { 
        #     self.xmppClient.Connection._sock:'xmpp', 
        #     self.mqttClient._sock:'mqtt',
        #     self.mqttClient._sockpairR:'mqttR'
        # }
    
        #go in infinite loop
        while( True ):
            # (ii , o, e) = select.select( socketlist.keys(),[],[],1 )
            # for i in ii:
            #     if( socketlist[i] == 'xmpp' ):
            #         self.xmppClient.Process( 1 )
            #     elif( socketlist[i] in [ 'mqtt', 'mqttR' ] ):
            #         self.mqttClient.loop()
            # print( 'in infinite loop' )
            # if( self.xmppClient.isConnected() ):
            #     self.xmppClient.Process( 1 ) #if this line is ommited no messages are received
            time.sleep( 1 )
            # else:
            #     self.__xmppConnect()
            pass

    def __mqttConnect( self, xmppQueue, mqttQueue ):
        self.mqttClient = mqtt.Client( self.mqttId )
        self.mqttClient.xmppQueue = xmppQueue
        self.mqttClient.mqttQueue = mqttQueue
        self.mqttClient.on_connect = self.__on_mqttConnect
        self.mqttClient.on_message = self.__on_mqttMessage
        self.mqttClient.connect( self.mqttParams.address, self.mqttParams.port )
        self.mqttClient.loop_start()
        while( True ):
            try:
                mqttMessage = self.mqttClient.mqttQueue.get_nowait()
                type = mqttMessage.getType()
                fromjid = mqttMessage.getFrom().getStripped()
                text = mqttMessage.getBody()
                try:
                    cmds = json.loads( text )
                    print( 'cmds: {}'.format( json.dumps( cmds, indent = 2 ) ) )
                    if( 'cmd' in cmds and cmds[ 'cmd' ] is not None ):
                        if( cmds[ 'cmd' ] == 'subscribe' and 'topic' in cmds and cmds[ 'topic' ] is not None ):
                            print( 'subscribing to topic [{}]'.format( cmds[ 'topic' ] ) )
                            self.mqttClient.subscribe( cmds[ 'topic' ] )
                            self._subscriptions.add( cmds[ 'topic' ], fromjid )
                        elif( cmds[ 'cmd' ] == 'unsubscribe' and 'topic' in cmds and cmds[ 'topic' ] is not None ):
                            print( 'Unsubscribing from topic [{}]'.format( cmds[ 'topic' ] ) )
                            self.mqttClient.unsubscribe( cmds[ 'topic' ] )
                            self._subscriptions.remove( cmds[ 'topic' ], fromjid )
                        elif ( cmds[ 'cmd' ] == 'publish' and 'topic' in cmds and cmds[ 'topic' ] is not None and 'message' in cmds and cmds[ 'message' ] is not None ):
                            payload = base64.b64decode( cmds[ 'message' ] )
                            print( 'publishing topic [{}], payload: [{}]'.format( cmds[ 'topic' ], payload ) )
                            self.mqttClient.publish( cmds[ 'topic' ], payload, qos = 2, retain = False )
                except Exception, e:
                    print( 'Error: {}'.format( e.message ) )
                    pass
            except Queue.Empty:
                #nothing to do if queue is empty
                pass

    def start( self, event ):
        self.xmppClient.send_presence()

    def message(self, msg):
        if msg['type'] in ('message', 'chat', None):
            msg.reply("Thanks for sending\n%(body)s" % msg).send()
        
    def __signalHandler( self, signal, frame ):
        print('Ctrl+C pressed!')
        self.mqttClient.disconnect()
        self.mqttClient.loop_stop()
        sys.exit(0)        

    def __on_mqttConnect( self, client, userdata, flags_dict, result ):
        """Executed when a connection with the mqtt broker has been established
        """
        #debug:
        m = "Connected flags"+str(flags_dict)+"result code " + str(result)+"client1_id  "+str(client)
        print( m )

    def __xmppConnect( self, xmppQueue, mqttQueue ):
        print( 'Attempting to connect to {}:{}'.format( self.xmppParams.server, self.xmppParams.port ) )
        self.jid = xmpp.protocol.JID( self.xmppParams.jid )
        self.xmppClient = xmpp.Client( self.jid.getDomain(), debug=[] )
        self.xmppClient.xmppQueue = xmppQueue
        self.xmppClient.mqttQueue = mqttQueue
        con = self.xmppClient.connect( ( self.xmppParams.server, self.xmppParams.port ) )
        if not con:
            print 'xmpp could not connect!'
            return False
        print 'xmpp connected with', con
        auth = self.xmppClient.auth( self.jid.getNode(), self.xmppParams.password,resource = self.jid.getResource() )
        if not auth:
            print 'xmpp could not authenticate!'
            return False
        print 'xmpp authenticated using', auth
        print( 'Xmpp connected as jid:{}'.format( self.jid ) )

        self.xmppClient.RegisterHandler( 'message', self.__on_xmppMessage )
        # self.xmppClient.RegisterDisconnectHandler( self.__on_xmppDisconnect )
        # self.xmppClient.send( xmpp.Message( self.xmppParams.destination, 'testing from {}'.format( jid ) ) )
        self.xmppClient.sendInitPresence( requestRoster = 0 ) #if this line is ommited no messages are received
        
        while( True ):
            if( self.xmppClient.isConnected() ):
                self.xmppClient.Process( 1 ) #if this line is ommited no messages are received
                try:
                    # xmppMessage = self.xmppClient.xmppQueue.get_nowait()
                    mqttMessage = self.xmppClient.xmppQueue.get_nowait()
                    for jid in self._subscriptions.jids( mqttMessage.topic ):
                        try:
                            text = bytes( '{{ "topic": "{}", "payload": {} }}'.format( mqttMessage.topic, mqttMessage.payload.decode( "utf-8" ) ).encode('utf-8') )
                            xmppMessage = xmpp.Message( to = jid, body = base64.b64encode( zlib.compress( text, 9 ) ), typ = 'chat' )
                            print( 'Sending xmpp message (type:[{}]) to [{}]. uncompressed body: {}'.format( xmppMessage.getType(), xmppMessage.getTo(), text ) )
                            self.xmppClient.send( xmppMessage )                            
                        except Exception, e:
                            print( 'An error occured while trying to send xmpp message. Error: {}'.format( e.message ) )
                            # self.xmppClient.xmppQueue.put( xmppMessage )
                except Queue.Empty:
                    #nothing to do if queue is empty
                    # print( 'xmppQueue is empty' )
                    pass
            else:
                self.__on_xmppDisconnect()
            time.sleep( 1 )

    def __on_xmppDisconnect( self ):
        print( 'xmpp disconnected, attempting to reconnect' )
        try:
            self.__xmppConnect( self.xmppQueue, self.mqttQueue )
        except Exception, e:
            print( 'Failed to reconnect. Error: {}'.format( e.message ) )

    def __on_mqttMessage( self, client, userdata, message ):
        """Executed when an mqtt arrives

        cmd format: 
            { "cmd":"subscribe", "topic": "A///CONFIGURATION/C/status" }
            { "cmd":"unsubscribe", "topic": "A///CONFIGURATION/C/status" }
            { "cmd":"publish", "topic": "A///CONFIGURATION/C/cmd", "message": "eyJjbWQiOiAiU0VORCJ9" } message is base64 encoded command for mqtt
        """
        text = message.payload.decode( "utf-8" )
        print( 'Received mqtt message "{}"'.format( text ).encode( 'utf-8' ) )
        try:
            if( self._subscriptions.contains( message.topic ) ):            
                self.mqttClient.xmppQueue.put_nowait( message )
                # xmppMessage = bytes( '{{ "topic": "{}", "payload": {} }}'.format( message.topic, text ).encode('utf-8') )
                # # xmppMessage = base64.b64encode( bytes( '{{ "topic": {}, "payload": {} }}'.format( message.topic, 'test' ).encode('utf-8') ) )
                # # print( 'Will attempt to send xmpp message with body size {}'.format( len( xmppMessage ) ) )
                # # print 'original length:', len( xmppMessage )
                # # print 'zlib compressed length:', len( zlib.compress( xmppMessage, 9 ) )
                # # print 'bz2 compressed length:', len( bz2.compress( xmppMessage ) )
                # for jid in self._subscriptions.jids( message.topic ):               
                #     #if self.xmppClient is in the main thread the next line disconnects from the xmpp server and never connects again
                #     # self.xmppClient.send( xmpp.Message( jid, xmppMessage, 'chat' ) )
                #     self.mqttClient.xmppQueue.put_nowait( xmpp.Message( to = jid, body = base64.b64encode( zlib.compress( xmppMessage, 9 ) ), typ = 'chat' ) )
            else:
                print( 'Topic [{}] is not in the subscriptions'.format( message.topic ) )
        except Exception as e:
            print( 'Error: ', e )
            return

    def __on_xmppMessage( self, con, event ):
        type = event.getType()
        fromjid = event.getFrom().getStripped()
        text = event.getBody()
        # print( 'xmpp message "{}" arrived from {}, text: [{}]'.format( type, fromjid, text.decode( "utf-8" ) ).encode( 'utf-8' ) )
        print( 'xmpp message "{}" arrived from {}'.format( type, fromjid ).encode( 'utf-8' ) )
        if( type in ['message', 'chat', None] and fromjid in self.xmppParams.authorizedRemoteJids ):
            # self.xmppClient.send( xmpp.Message( fromjid, 'You sent "{}"'.format( event.getBody() ) ) )
            self.xmppClient.mqttQueue.put_nowait( event )

if( __name__ == '__main__' ):
    configurationFile = 'xmpp_proxy.conf'
    if( not os.path.isfile( configurationFile ) ):
        print( 'Configuration file "{}" not found, exiting.'.format( configurationFile ) )
        sys.exit()

    with open( configurationFile ) as json_file:
        configuration = json.load( json_file )
        print( 'Configuration: \n{}'.format( json.dumps( configuration, indent = 2  ) ) )
        

        xmppProxy = XmppProxy( 
            configuration['mqttId'],
            MqttParams( configuration['mqttParams']['address'], int( configuration['mqttParams']['port'] ) ),
            XmppParams( configuration['xmppParams']['user'], configuration['xmppParams']['password'], configuration['xmppParams']['server'], configuration['xmppParams']['port'], [ arj for arj in configuration['xmppParams']['authorizedRemoteJids'] ] )
        )

        xmppProxy.run()