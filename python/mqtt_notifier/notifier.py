#!/usr/bin/env python
import paho.mqtt.client as mqtt  #import the client1
import signal   #to detect CTRL C
import sys

import json #to generate payloads for mqtt publishing
import jsonpickle #json.dumps crashes for InstantMessage. jsonpickle works fine
import os.path # to check if configuration file exists

import time
import smtplib
from email.MIMEMultipart import MIMEMultipart
from email.MIMEText import MIMEText

import xmpp
import sleekxmpp

from aux import *
# from gsm import *
# from wired_internet import *

class MqttParams( object ):
    """ Holds the mqtt connection params
    """
    def __init__( self, address, port, subscribeTopic, publishTopic ):
        self.address = address
        self.port = port
        self.subscribeTopic = subscribeTopic
        self.publishTopic = publishTopic

class Notifier( object ):
    """ This class handles notifications such as phonecalls, sms, email and IM
        Important Note: both the xmpp and sleekxmpp versions work. However,
        messages sent are not visible in android jabber although they arrive
        without a problem in android hangouts!!!
    """
    COMMASPACE = ', '

    def __init__( self, mqttId, mqttParams, mailParams, imParams, smsParams ):
        self.mqttParams = mqttParams
        self.mqttId = mqttId
        self.mailParams = mailParams
        self.imParams = imParams
        self.smsParams = smsParams

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
        #go in infinite loop
        while( True ):
            time.sleep( 1 )
            pass

    def __signalHandler( self, signal, frame ):
        print('Ctrl+C pressed!')
        self.client.disconnect()
        self.client.loop_stop()
        sys.exit(0)        

    def __on_connect( self, client, userdata, flags_dict, result ):
        """Executed when a connection with the mqtt broker has been established
        """
        #debug:
        m = "Connected flags"+str(flags_dict)+"result code " + str(result)+"client_id  "+str(client)
        print( m )

        # tell other devices that the notifier is available
        self.client.will_set( self.mqttParams.publishTopic, json.dumps({ 'main': 'AVAILABLE' }), qos = 1, retain = False )
        
        #subscribe to start listening for incomming commands
        self.client.subscribe( self.mqttParams.subscribeTopic )

    def __on_message( self, client, userdata, message ):
        """Executed when an mqtt arrives

        cmd format: 
            "email": { "from": "sender", "to": "recipient", "subject": "the subject", "body": "the body" }
            "im": { "recipients": [ "jabber id of each recipient e.g. user@gmail.com" ], "message": "the message" }
            "phonecall": [ phonenumber1, phonenumber2, ..., phonenumberN  ] #currently not supported
            "sms": { "text": "the message", "phones": [ phonenumber1, phonenumber2, ..., phonenumberN  ] }
        """
        text = message.payload.decode( "utf-8" )
        print( 'Received message "{}"'.format( text ).encode( 'utf-8' ) )
        if( mqtt.topic_matches_sub( self.mqttParams.subscribeTopic, message.topic ) ):
            try:
                cmds = json.loads( text )
            except ValueError, e:
                print( '"{}" is not a valid json text, exiting.'.format( text ) )
                return

            # try:
            
            if( 'email' in cmds and cmds[ 'email' ] is not None ):
                #note: Email.To param must be a list of recipients (even if it contains only one element )
                # self.email( Email( cmds[ 'email' ][ 'From' ], cmds[ 'email' ][ 'To' ], cmds[ 'email' ][ 'subject' ], cmds[ 'email' ][ 'body' ] ) )
                pass
            if( 'im' in cmds and cmds[ 'im' ] is not None ):
                # wiCmds[ 'im' ] = InstantMessage( cmds[ 'im' ][ 'recipients' ], cmds[ 'im' ][ 'message' ] )
                # wiCmds[ 'im ' ] = jsonpickle.decode( json.dumps( cmds[ 'im' ] ) )
                iMessage = jsonpickle.decode( json.dumps( cmds[ 'im' ] ) )
                print( 'Will send im to:{}, message:{}'.format( iMessage.recipients, iMessage.message.encode( 'utf-8' )  ) )
                self.im( iMessage )

            # phonecalls are not supported yet, must find the right hardware first
            # if( 'phonecall' in cmds  and cmds[ 'phonecall' ] is not None ):
                # gsmCmds[ 'phonecall' ] = cmds[ 'phonecall' ]
                #TODO

            # if( 'sms' in cmds and cmds[ 'sms' ] is not None ):
            #     for p in cmds[ 'sms' ][ 'phones' ]:
            #         sms = json.dumps( {"cmd":"send", "params": { "to":p, "text": cmds[ 'sms' ][ 'text' ] } } )
            #         print( 'Publishing sms topic:{} mqtt-message: [{}]'.format( self.smsParams.publishTopic, sms ) )
            #         self.client.publish( self.smsParams.publishTopic, sms, qos = 2, retain = False )

            # except Exception as e:
            #     print( 'An error occurred while executing cmds in message "{}"'.format( text ).encode( 'utf-8' ) )
            #     print( 'Error: {}'.format( e ) )

    def email( self, mail ):
        msg = MIMEMultipart()
        msg['Subject'] = mail.subject
        msg['From'] = mail.From
        msg['To'] = Notifier.COMMASPACE.join( mail.To )
        msg.attach( MIMEText( mail.body.encode('utf8'), 'plain' ) )
        server = smtplib.SMTP( self.mailParams.server, self.mailParams.port )
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login( self.mailParams.username, self.mailParams.password )
        server.sendmail( mail.From, mail.To, msg.as_string() )
        server.quit()
        return True

    def im2( self, iMessage ):
        """version using sleekxmpp
        """
        self.xmppMessage = iMessage 
        self.xmppClient = sleekxmpp.ClientXMPP( self.imParams.jid, self.imParams.password )
        self.xmppClient.add_event_handler('session_start', self.startXmpp )
        self.xmppClient.register_plugin('xep_0030') # Service Discovery
        self.xmppClient.register_plugin('xep_0199') # XMPP Ping
        if self.xmppClient.connect():
            self.xmppClient.process(block=True)
            print("sleekxmpp: Done")
        else:
            print("sleekxmpp: Unable to connect.")
    
    def startXmpp( self, event ):
        print( 'sleekxmpp: session started' )
        self.xmppClient.send_presence()
        print( 'sleekxmpp: presence sent' )
        self.xmppClient.get_roster()
        print( 'sleekxmpp: got roster' )
        for r in self.xmppMessage.recipients:
            self.xmppClient.send_message( mto = r, mbody = self.xmppMessage.message, mtype='chat' )
        self.xmppClient.disconnect(wait=True)
        print( 'sleekxmpp: disconnected' )
        self.xmppMessage = None

    def im( self, iMessage ):
        jid = xmpp.protocol.JID( self.imParams.jid )
        # cl = xmpp.Client( jid.getDomain(), debug=['always'] )
        cl = xmpp.Client( jid.getDomain(), debug=[] )
        con = cl.connect( ( self.imParams.server, self.imParams.port ) )
        if not con:
            print 'xmpp could not connect!'
            return False
        print 'xmpp connected with', con
        auth = cl.auth( jid.getNode(), self.imParams.password,resource = jid.getResource() )
        if not auth:
            print 'xmpp could not authenticate!'
            return False
        print 'xmpp authenticated using', auth

        # cl.Process( 1 )
        cl.sendInitPresence( requestRoster = 0 ) #if this line is ommited no messages are received
        # cl.Process( 1 )
        for r in iMessage.recipients:
            id = cl.send(xmpp.protocol.Message( r, iMessage.message, typ = 'chat' ) )
            cl.Process( 1 )
            print( 'xmpp sent message [{}] with id {}'.format( iMessage.message.encode( 'utf-8' ), id ) )

        time.sleep(2)   # some older servers will not send the message if you disconnect immediately after sending

        cl.disconnect()
        return True

if( __name__ == '__main__' ):
    configurationFile = 'notifier.conf'
    if( not os.path.isfile( configurationFile ) ):
        print( 'Configuration file "{}" not found, exiting.'.format( configurationFile ) )
        sys.exit()

    with open( configurationFile ) as json_file:
        configuration = json.load( json_file )
        print( 'Configuration: \n{}'.format( json.dumps( configuration, indent = 2  ) ) )
        

        notifier = Notifier( 
            configuration['mqttId'],
            MqttParams( configuration['mqttParams']['address'], int( configuration['mqttParams']['port'] ), configuration['mqttParams']['subscribeTopic'], configuration['mqttParams']['publishTopic'] ),
            MailParams( configuration['mailParams']['user'], configuration['mailParams']['password'], configuration['mailParams']['server']['url'], configuration['mailParams']['server']['port'] ), 
            InstantMessageParams( configuration['instantMessageParams']['user'], configuration['instantMessageParams']['password'], configuration['instantMessageParams']['server'], configuration['instantMessageParams']['port'] ),
            SmsParams( configuration['smsParams']['publishTopic'])
        )

        notifier.run()