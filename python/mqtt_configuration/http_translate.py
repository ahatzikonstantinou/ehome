#!/usr/bin/env python
import web
import json
import os.path # to check if configuration file exists


def notfound():
    #return web.notfound("Sorry, the page you were looking for was not found.")
    return json.dumps({'ok':0, 'errcode': 404})

def internalerror():
    #return web.internalerror("Bad, bad server. No donut for you.")
    return json.dumps({'ok':0, 'errcode': 500})

def badData():
    return json.dumps( { 'ok': 0, 'errcode': 400 } )

urls = (
    '/translate(.*)', 'translate'
)


app = web.application(urls, globals())
app.notfound = notfound
app.internalerror = internalerror

# class configuration:
#     ConfigurationFile = 'configuration.json'
#     def GET( self, params ):        
#         queryString = web.input()
#         print( queryString )
#         if( not os.path.isfile( configuration.ConfigurationFile ) ):
#             print( 'Configuration file "{}" not found, exiting.'.format( configuration.ConfigurationFile ) )
#             return internalerror()

#         with open( configuration.ConfigurationFile ) as json_file:
#             configurationTxt = json.load( json_file )
#             # print( 'Configuration: \n{}', json.dumps( configurationTxt ) )
#             # the response must have this particular format due to angular quirks see https://stackoverflow.com/questions/11574850/jsonp-web-service-with-python
#             return '{0}({1})'.format( queryString.callback, json.dumps( configurationTxt, indent=2 ) )

#     def POST( self ):
#         data = web.data()
#         print( data )
#         try:
#             json.loads( data )
#         except:
#             return badData()

#         try:
#             with open( configuration.ConfigurationFile, 'w' ) as outfile:
#                 json.dump( data, outfile )
#         except:
#             internalerror()
        
#         return json.dumps( { 'ok': 200, 'errcode': 0 } )

class Translation( object ):
    def __init__( self ):
        self.house = ''
        self.floor = ''
        self.room = ''
        self.domain = ''
        self.item = ''

class translate:
    """ Handle translation requests. 
        If using __findTranslation, the request must be of type http://url:port/translate?item=A/4/L/DOOR
        The translator expects to parse house/floor/room/domain/name/... a 4+ parts string, with the '/' delimiter 
        Example "A///MOTION/M/status". This will work only if the parts correspond both to the publish element of an item
        as well as the mqtt elements of a house,floor, room
        If using LocationFinder the item param is the concatenated mqtt values of all nodes involved in the node hierarchy
        to be translated
    """
    ConfigurationFile = os.path.dirname(os.path.abspath(__file__)) + '/houses-configuration.json'
    def GET( self, params ):
        params = web.input()
        print( params )
        if( params.item is None ):
            return badData()

        method = 1
        if( 'method' in params ):
            method = int( params.method )

        try:
            with open( translate.ConfigurationFile ) as json_file:
                configurationTxt = json.load( json_file )
        except:
            print( 'There seems to be an error reading the configuration from {}'.format( translate.ConfigurationFile ) )
            return internalerror()
                        
        if( method == 0 ):
            locationFinder = self.LocationFinder()
            self.__locateConfigurationNode( 'mqtt', ( "/" + params.item.strip() ).split( "/" ), 0, configurationTxt, locationFinder )
            text = ', '.join( locationFinder.texts ).encode( 'utf-8' ) 
            print( 'location finder has: "{}"'.format( text ) )
            return text

        translation = self.__findTranslation( params.item, configurationTxt['houses'] )
        
        if( translation is None ):
            return notfound()

        # return '{0}({1})'.format( params.callback, json.dumps( translation, indent=2 ) )
        text = json.dumps( { 'house': translation.house, 'floor': translation.floor, 'room': translation.room, 'domain': translation.domain, 'item': translation.item }, indent=2, ensure_ascii=False, encoding='utf8' )
        print( 'will return translation: {}'.format( text.encode( 'utf-8' ) )  )
        return text #.encode( 'utf-8' )


    def __findTranslation( self, translate, configurationTxt ):
        # print( configurationTxt )
        translation = Translation()
        sections = translate.split( "/" )
        print( sections )
        translation.domain = sections[3]
        house = sections[0]
        if( len( house ) > 0 ):
            houseConf = self.__findInConfiguration( house, None, configurationTxt, 'mqtt' )
            if( houseConf is not None ):
                translation.house = houseConf[ 'name' ]
                floor = sections[1]
                print( 'floor: {}', floor )
                if( len( floor ) == 0 ):
                    itemConf = self.__findInConfiguration( translate, 'items', houseConf, 'publish' )
                    if( itemConf is not None ):
                        translation.item = itemConf[ 'name' ]
                else:
                    floorConf = self.__findInConfiguration( floor, 'floors', houseConf, 'mqtt' )
                    if( floorConf is not None ):
                        translation.floor = floorConf[ 'name' ]

                    room = sections[2]
                    if( len( room ) == 0 ):
                        itemConf = self.__findInConfiguration( translate, 'items', houseConf, 'publish' )
                        if( itemConf is not None ):
                            translation.item = itemConf[ 'name' ]
                    else:
                        roomConf = self.__findInConfiguration( room, 'rooms', floorConf, 'mqtt' )
                        if( roomConf is not None ):
                            translation.room = roomConf[ 'name' ]
                            itemConf = self.__findInConfiguration( translate, 'items', roomConf, 'publish' )
                            if( itemConf is not None ):
                                translation.item = itemConf[ 'name' ]
                
        return translation

    def __findInConfiguration( self, mqtt, entity, configuration, tag ):
        configurationSection = configuration
        if( entity is not None ):
            if( not entity in configuration ):
                return None
            else:
                configurationSection = configuration[ entity ]

        for i in range( 0, len( configurationSection ) ):
            if( tag in configurationSection[i] and configurationSection[ i ][ tag ] == mqtt ):
                return configurationSection[ i ]
        
        return None

    class LocationFinder( object ):
        def __init__( self ):
            self.texts = []
            self.foundLocation = False
            self.finished = False
            self.node = None
        def search( self, locationTag, locations, currenLocationIndex, configurationNode, storeText ):
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

            if( self.foundLocation and 'name' in configurationNode and storeText ):
                self.texts.append( configurationNode['name'] )
                
            if( self.foundLocation and ( currenLocationIndex + 1 == len( locations ) ) ):
                self.finished = True
                self.node = configurationNode

    def __locateConfigurationNode( self, locationTag, locations, currenLocationIndex, configurationNode, locationFinder ):
        if( locationFinder.finished ):
            return True
        
        nodeType = type( configurationNode )
        if( nodeType is dict ):
            locationFinder.search( locationTag, locations, currenLocationIndex, configurationNode, True )
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
                locationFinder.search( locationTag, locations, currenLocationIndex, configurationNode[i], False )
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
    app = web.application(urls, globals())
    app.run()

app = web.application(urls, globals(), autoreload=False)
application = app.wsgifunc()