(function () {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Configuration', Configuration);

    Configuration.$inject = [ 'Door1', 'Window1', 'Window1R', 'Light1', 'TemperatureHumidity', 'Door2R', 'Net', 'Roller1_Auto', 'Window2R', 'Roller1', 'Light2', 'Alarm', 'IPCamera', 'IPCameraPanTilt', 'MotionCamera', 'MotionCameraPanTilt', '$resource', 'Modem', 'Sms' ];

    function Configuration( Door1, Window1, Window1R, Light1, TemperatureHumidity, Door2R, Net, Roller1_Auto, Window2R, Roller1, Light2, Alarm, IPCamera, IPCameraPanTilt, MotionCamera, MotionCameraPanTilt, $resource, Modem, Sms )
    {
        return {
            generateList: function( data, $scope )
            {
                var items = []
                for( var i = 0 ; i < data.items.length ; i++ )
                {
                    items.push( generateItem( data.items[i], $scope ) );
                }

                return {
                    items: items,
                    houses: generateHousesList( data.houses, $scope )
                };
            }
        };

        function generateHousesList( data, $scope )
        {
            var housesList = []
            for( var h = 0 ; h < data.length ; h++ )
            {
                var house = {
                        name: data[h].name,
                        floors: [],
                        items: []
                };
                for( var f = 0 ; f < data[h].floors.length ; f++ )
                {
                    var floor = {
                        name: data[h].floors[f].name,
                        rooms: []
                    }

                    for( var r = 0 ; r < data[h].floors[f].rooms.length ; r ++ )
                    {
                        var room = {
                            name: data[h].floors[f].rooms[r].name,
                            items: []
                        }
                        for( var i = 0 ; i < data[h].floors[f].rooms[r].items.length ; i++ )
                        {
                            room.items.push( generateItem( data[h].floors[f].rooms[r].items[i], $scope ) )
                        }
                        floor.rooms.push( room );
                    }
                    house.floors.push( floor );
                }

                for( var i = 0 ; data[h].items && i < data[h].items.length ; i++ )
                {
                    house.items.push( generateItem( data[h].items[i], $scope ) )
                }
                
                // console.log( house );
                housesList.push( house );
            }
            return housesList;
        }

        function generateItem( def, $scope )
        {
            var item = {
                name: def.name,
                domain: def.domain,
                type: def.type,
                protocol: def.protocol,
                device: {}
            }
            switch( item.type )
            {
                case 'ALARM':
                    item.device = new Alarm( def.subscribe, def.publish, { main: 'UNAVAILABLE' }, $scope );
                    break;
                case 'NET':
                    item.device = new Net( def.subscribe, { main: 'UNAVAILABLE' }, $scope );
                    break;
                case 'DOOR1':
                    item.device = new Door1( def.subscribe, { main: 'UNAVAILABLE' }, $scope );
                    break;
                case 'DOOR2R':                
                    item.device = new Door2R( def.subscribe, { left: 'UNAVAILABLE', right: 'UNAVAILABLE', recline: 'UNAVAILABLE' }, $scope );
                    break;
                case 'IPCAMERA':
                    item.device = new IPCamera( def.url );
                    break;
                case 'IPCAMERAPANTILT':
                    item.device = new IPCameraPanTilt( def.baseUrl, def.videostream, def.right, def.left, def.up, def.down, def.stop );
                    break;
                case 'LIGHT1':
                    item.device = new Light1( def.subscribe, def.publish, { state: 'offline' }, $scope );
                    break;
                case 'LIGHT2':
                    item.device = new Light2( def.subscribe, def.publish, { left: 'UNAVAILABLE', right: 'UNAVAILABLE' }, $scope );
                    break;
                case 'MOTIONCAMERA':
                    item.device = new MotionCamera( def.subscribe, def.publish, def.cameraId, def.videostream, 'UNAVAILABLE', 'NO_MOTION', $scope );
                    break;
                case 'MOTIONCAMERAPANTILT':
                    item.device = new MotionCameraPanTilt( def.subscribe, def.publish, def.cameraId, def.videostream, 'UNAVAILABLE', 'NO_MOTION', $scope );
                    break;
                case 'ROLLER1':
                    item.device = new Roller1( def.subscribe, { main: 'UNAVAILABLE' }, $scope );
                    break;
                case 'ROLLER1_AUTO':
                    item.device = new Roller1_Auto( def.subscribe, def.publish, { main: 'UNAVAILABLE', percent: -1 }, $scope );
                    break;
                case 'TEMPERATURE_HUMIDITY':
                    item.device = new TemperatureHumidity( def.subscribe, { main: 'UNAVAILABLE', temperature: 0, humidity: 0 }, $scope );
                    break;
                case 'WINDOW1':
                    item.device = new Window1( def.subscribe, { main: 'UNAVAILABLE' }, $scope);
                    break;
                case 'WINDOW1R':
                    item.device = new Window1R( def.subscribe, { main: 'UNAVAILABLE', recline: 'UNAVAILABLE' }, $scope );
                    break;
                case 'WINDOW2R':
                    item.device = new Window2R( def.subscribe, { left: 'UNAVAILABLE', right: 'UNAVAILABLE', recline: 'UNAVAILABLE' }, $scope );
                    break;
                case 'MODEM':
                    item.device = new Modem( def.subscribe, def.publish, {}, $scope );
                    break;
                case 'SMS':
                    item.device = new Sms( def.subscribe, def.publish, {}, $scope );
                    break;
            }

            return item;
        }
            
/*
        var service = {
            data: [
            { 
                name: 'Διαμέρισμα Αντώνη', 
                floors: [ 
                    { 
                        name: '4ος', 
                        rooms: [ 
                            { 
                                name: "Χωλ",
                                items: [
                                    // { name: 'Πόρτα εισόδου', domain: 'DOOR', type: 'DOOR1', protocol: 'mqtt', device: new Door1( 'A/4/H/DOOR/D', { main: 'OPEN' } ) },
                                    // { name: 'Παράθυρο φωταγωγού', domain: 'WINDOW', type: 'WINDOW1R', protocol: 'mqtt', device: new Window1R( 'A/4/H/WINDOW/W', { main: 'OPEN', recline: 'CLOSED' } ) },
                                    // { name: 'Σίτα φωταγωγού', domain: 'COVER', type: 'NET', protocol: 'mqtt', device: new Net( 'A/4/H/COVER/W', { main: 'CLOSED' } ) },
                                    // { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/H/LIGHT/LC/state', 'A/4/H/LC/set', { main: 'OFF' } ) },
                                    // { name: 'Εξωτερικό φως εισόδου', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/H/LIGHT/LO/state', 'A/4/H/LO/set', { main: 'OFF' } ) },                                    
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERAPANTILT', protocol: 'http', device: new IPCameraPanTilt( 'http://192.168.1.79/webcam/', 'videostream.cgi?', 'decoder_control.cgi?command=6', 'decoder_control.cgi?command=4', 'decoder_control.cgi?command=0', 'decoder_control.cgi?command=2', 'decoder_control.cgi?command=1' )  },
                                    { name: 'Κίνηση', domain: 'MOTION', type: 'MOTIONCAMERAPANTILT', protocol: 'http', device: new MotionCameraPanTilt( 'A/4/H/MOTION/M', 'http://192.168.1.79:4081', 'http://192.168.1.79/webcam/decoder_control.cgi?command=6', 'http://192.168.1.79/webcam/decoder_control.cgi?command=4', 'http://192.168.1.79/webcam/decoder_control.cgi?command=0', 'http://192.168.1.79/webcam/decoder_control.cgi?command=2', 'http://192.168.1.79/webcam/decoder_control.cgi?command=1', 'http://192.168.1.79:4080/0/detection/start', 'http://192.168.1.79:4080/0/detection/pause', 'http://192.168.1.79:4080/0/detection/status', { main: 'NO_MOTION' } )  },
                                    // { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', device: new TemperatureHumidity( 'A/4/H/TH', { temperature: 25, humidity: 10 } ) }
                                ]
                            }, 
                            { 
                                name: "Σαλόνι",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR2R', protocol: 'mqtt', device: new Door2R( 'A/4/L/DOOR/D', { left: 'CLOSED', right: 'OPEN', recline: 'CLOSED' } ) },
                                    { name: 'Σίτα μπαλκονόπορτας', domain: 'COVER', type: 'NET', protocol: 'mqtt', device: new Net( 'A/4/L/COVER/NB', { main: 'CLOSED' } ) },
                                    { name: 'Ρολό μπαλκονόπορτας', domain: 'COVER', type: 'ROLLER1_AUTO', protocol: 'mqtt', device: new Roller1_Auto( 'A/4/L/COVER/RB/state', 'A/4/L/COVER/RB/set', { main: 'OPEN', percent: 10 } ) },
                                    { name: 'Παράθυρο', domain: 'WINDOW', type: 'WINDOW2R', protocol: 'mqtt', device: new Window2R( 'A/4/L/WINDOW/W', { left: 'CLOSED', right: 'CLOSED', recline: 'OPEN' } ) },
                                    { name: 'Σίτα παραθύρου', domain: 'COVER', type: 'NET', protocol: 'mqtt', device: new Net( 'A/4/L/COVER/NW', { main: 'CLOSED' } ) },
                                    { name: 'Ρολό παραθύρου', domain: 'COVER', type: 'ROLLER1', protocol: 'mqtt', device: new Roller1( 'A/4/L/COVER/RW', { main: 'CLOSED' } ) },
                                    { name: 'Γυάλινος Πολυέλεος', domain: 'LIGHT', type: 'LIGHT2', protocol: 'mqtt', device: new Light2( 'A/4/L/LIGHT/GCH/state', 'A/4/L/LIGHT/GCH/set', { left: 'OFF', right: 'ON' } ) },
                                    { name: 'Ξύλινος Πολυέλεος', domain: 'LIGHT', type: 'LIGHT2', protocol: 'mqtt',  device: new Light2( 'A/4/L/LIGHT/GCH/state', 'A/4/L/LIGHT/GCH/set', { left: 'OFF', right: 'OFF' } ) },
                                    { name: 'Σποτ μπαλκονόπορτα', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/L/LIGHT/LD/state', 'A/4/L/LIGHT/LD/set', { main: 'OFF' } ) },
                                    { name: 'Σποτ παραθύρου', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/L/LIGHT/LW/state', 'A/4/L/LIGHT/LW/set', { main: 'OFF' } ) },
                                    { name: 'Εξωτερικό φως μπαλκονόπορτα', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt',device: new Light1( 'A/4/L/LIGHT/LOB/state', 'A/4/L/LIGHT/LOB/set', { main: 'OFF' } ) },
                                    { name: 'Εξωτερικό φως παραθύρου', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/L/LIGHT/LOW/state', 'A/4/L/LIGHT/LOW/set', { main: 'OFF' } ) },
                                    { name: 'Κάμερα 1', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http', device: new IPCamera( 'http://192.168.1.79/webcam' ) },
                                    { name: 'Κάμερα 2', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http', device: new IPCamera( 'http://192.168.1.79/webcam' ) },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', device: new TemperatureHumidity( 'A/4/L/TH', { temperature: 26, humidity: 10 } ) }
                                ]
                            }, 
                            { 
                                name: "Κουζίνα",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR1', protocol: 'mqtt', device: new Door1( 'A/4/K/DOOR/D', { main: 'OPEN' } ) },
                                    { name: 'Παράθυρο νεροχύτη', domain: 'WINDOW', type: 'WINDOW1R', protocol: 'mqtt', device: new Window1R( 'A/4/K/WINDOW/WS', { main: 'OPEN', recline: 'CLOSED' } ) },
                                    { name: 'Σίτα παραθύρου νεροχύτη', domain: 'COVER', type: 'NET', protocol: 'mqtt', device: new Net( 'A/4/K/COVER/NWS', { main: 'CLOSED' } ) },
                                    { name: 'Παράθυρο φωταγωγού', domain: 'WINDOW', type: 'WINDOW1R', protocol: 'mqtt', device: new Window2R( 'A/4/Κ/WINDOW/WL', { left: 'CLOSED', right: 'CLOSED', recline: 'OPEN' } ) },
                                    { name: 'Σίτα παραθύρου φωταγωγού', domain: 'COVER', type: 'NET', protocol: 'mqtt', device: new Net( 'A/4/K/COVER/NWL', { main: 'CLOSED' } ) },
                                    { name: 'Φως μπαλκονιού', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/K/LIGHT/LB/state', 'A/4/K/LIGHT/LB/set', { main: 'OFF' } ) },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/K/LIGHT/LC/state', 'A/4/K/LIGHT/LC/set', { main: 'OFF' } ) },
                                    { name: 'Φως φαγητού', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/K/LIGHT/LD/state', 'A/4/K/LIGHT/LD/set', { main: 'OFF' } ) },
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http', device: new IPCamera( 'http://192.168.1.79/webcam' ) },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', device: new TemperatureHumidity( 'A/4/K/TH', { temperature: 29, humidity: 18 } ) }
                                ]
                            }, 
                            { 
                                name: "Μπάνιο",
                                items: [
                                    { name: 'Παράθυρο', domain: 'WINDOW', type: 'WINDOW1R', protocol: 'mqtt', device: new Window1R( 'A/4/B/WINDOW/W', { main: 'OPEN', recline: 'CLOSED' } ) },
                                    { name: 'Σίτα παραθύρου', domain: 'COVER', type: 'NET', protocol: 'mqtt', device: new Net( 'A/4/B/COVER/NW', { main: 'CLOSED' } ) },
                                    { name: 'Φως', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/B/LIGHT/L/state', 'A/4/B/LIGHT/L/set', { main: 'OFF' } ) },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', device: new TemperatureHumidity( 'A/4/B/TH', { temperature: 32, humidity: 80 } ) }
                                ]
                            }, 
                            { name: "WC", items: [ { name: 'Φως', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/WC/L/state', 'A/4/WC/L/set', { main: 'OFF' } ) } ] }, 
                            { 
                                name: "Κρεββατοκάμαρα",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR2R', protocol: 'mqtt', device: new Door2R( 'A/4/BR/DOOR/D', { left: 'CLOSED', right: 'OPEN', recline: 'CLOSED' } ) },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/BR/LIGHT/LC/state', 'A/4/BR/LIGHT/LC/set', { main: 'OFF' } ) },
                                    { name: 'Φως μπαλκονιού', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/BR/LIGHT/LB/state', 'A/4/BR/LIGHT/LB/set', { main: 'OFF' } ) },
                                    { name: 'Σποτ', domain: 'LIGHT', type: 'LIGHT1', protocol: 'mqtt', device: new Light1( 'A/4/BR/LIGHT/LS/state', 'A/4/BR/LIGHT/LS/set', { main: 'OFF' } ) },
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http', device: new IPCamera( 'http://192.168.1.79/webcam' ) },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', device: new TemperatureHumidity( 'A/4/BR/TH', { temperature: 22, humidity: 11 } ) }
                                ]
                            }, 
                            { 
                                name: "Γραφείο",
                                items: [
                                    { name: 'Παράθυρο', domain: 'DOOR', type: 'WINDOW2R', protocol: 'mqtt', device: new Window2R( 'A/4/O/WINDOW/W', { left: 'CLOSED', right: 'CLOSED', recline: 'OPEN' } ) },
                                    { name: 'Φως', domain: 'LIGHT', type: 'LIGHT2', protocol: 'mqtt', device: new Light2( 'A/4/O/LIGHT/L/state', 'A/4/O/LIGHT/L/set', { left: 'OFF', right: 'OFF' } ) },
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http', device: new IPCamera( 'http://192.168.1.79/webcam' ) },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', device: new TemperatureHumidity( 'A/4/BR/TH', { temperature: 23, humidity: 10 } ) }
                                ]
                            } 
                        ] 
                    } 
                ],
                items: [ { name: 'Συναγερμός', domain: 'ALARM', type: 'ALARM', protocol: 'mqtt', device: new Alarm( 'A///ALARM/A/status', 'A///ALARM/A/set', { main: 'ACTIVATED', countdown: 13 } ) } ]
            },
            { 
                name: 'Διαμέρισμα Ειρήνης', 
                floors: [ 
                    { 
                        name: '3ος', 
                        rooms: [ 
                            { 
                                name: "Χωλ",
                                items: [
                                    { name: 'Πόρτα εισόδου', domain: 'DOOR', type: 'DOOR1', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'ON' },
                                    { name: 'Εξωτερικό φως εισόδου', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 22, humidity: 11 } }
                                ]
                            }, 
                            { 
                                name: "Σαλόνι",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR2R', protocol: 'mqtt', state: { left: 'CLOSED', right: 'OPEN', recline: 'CLOSED' } },
                                    { name: 'Σίτα μπαλκονόπορτας', domain: 'COVER', type: 'NET', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Ρολό μπαλκονόπορτας', domain: 'COVER', type: 'ROLLER1', protocol: 'mqtt', state: 'OPEN' },
                                    { name: 'Πολυέλεος 1/2', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Πολυέλεος 2/2', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Φως μπαλκονιού', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 23, humidity: 10 } }
                                ]
                            }, 
                            { 
                                name: "Τραπεζαρία",
                                items: [
                                    { name: 'Παράθυρο', domain: 'WINDOW', type: 'WINDOW2R', protocol: 'mqtt', state: { left: 'CLOSED', right: 'CLOSED', recline: 'OPEN' } },
                                    { name: 'Σίτα παραθύρου', domain: 'COVER', type: 'NET', protocol: 'mqtt', state: 'OPEN' },
                                    { name: 'Ρολό παραθύρου', domain: 'COVER', type: 'ROLLER1', protocol: 'mqtt', state: 'OPEN' },
                                    { name: 'Πολυέλεος 1/2', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Πολυέλεος 2/2', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 24, humidity: 11 } }
                                ]
                            }, 
                            { 
                                name: "Καθιστικό",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR2R', protocol: 'mqtt', state: { left: 'CLOSED', right: 'OPEN', recline: 'CLOSED' } },
                                    { name: 'Σίτα μπαλκονόπορτας', domain: 'COVER', type: 'NET', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Ρολό μπαλκονόπορτας', domain: 'COVER', type: 'ROLLER1', protocol: 'mqtt', state: 'OPEN' },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Φως μπαλκονιού', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 20, humidity: 10 } }
                                ]
                            }, 
                            { 
                                name: "Κουζίνα",
                                items: [
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 28, humidity: 23 } }
                                ]
                            }, 
                            { 
                                name: "Μπάνιο",
                                items: [
                                    { name: 'Παράθυρο', domain: 'WINDOW', type: 'WINDOW1R', protocol: 'mqtt', state: { main: 'OPEN', recline: 'CLOSED' } },
                                    { name: 'Σίτα παραθύρου', domain: 'COVER', type: 'NET', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 20, humidity: 17 } }
                                ]
                            }, 
                            { 
                                name: "Κρεββατοκάμαρα",
                                items: [
                                    { name: 'Παράθυρο', domain: 'WINDOW', type: 'WINDOW1R', protocol: 'mqtt', state: { main: 'CLOSED', recline: 'CLOSED' } },
                                    { name: 'Σίτα παραθύρου', domain: 'COVER', type: 'NET', protocol: 'mqtt', state: 'OPEN' },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 24, humidity: 11 } }
                                ]
                            } 
                        ] 
                    } 
                ],
                items: [ { name: 'Συναγερμός', domain: 'ALARM', type: 'ALARM', protocol: 'mqtt' } ] 
            },
            { name: 'Εξοχικό Αλυκή', floors: [ 
                { name: 'Ισόγειο', rooms: [ { name: 'Κουζίνα', items: [] }, { name: 'Σαλόνι', items: [] }, { name: 'Μπάνιο', items: [] } ] }, 
                { name: '1ος', rooms: [ { name: 'Σαλόνι', items: [] }, { name: 'Μπάνιο', items: [] }, { name: 'WC', items: [] }, { name: 'Κρεββατοκάμαρα', items: [] }, { name: 'Κρεββατοκάμαρα παιδιών', items: [] }, { name: 'Κρεββατοκάμαρα Αθηνάς', items: [] }, { name: 'Κρεββατοκάμαρα δυτική', items: [] } ] } 
                ] 
            },
            { 
                name: 'Εταιρία', 
                floors: [ 
                    { 
                        name: '1ος', 
                        rooms: [ 
                            { 
                                name: "Χωλ",
                                items: [
                                    { name: 'Πόρτα εισόδου', domain: 'DOOR', type: 'DOOR1', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Εξωτερικό φως εισόδου', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'ON' },
                                    { name: 'Σποτ', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http' },
                                ]
                            }, 
                            { 
                                name: "Σαλόνι",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR2R', protocol: 'mqtt', state: { left: 'CLOSED', right: 'CLOSED', recline: 'CLOSED' } },
                                    { name: 'Σίτα μπαλκονόπορτας', domain: 'COVER', type: 'NET', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Ρολό μπαλκονόπορτας', domain: 'COVER', type: 'ROLLER1_AUTO', protocol: 'mqtt', state: { main: 'OPEN', percent: 10 } },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Φως μπαλκονιού', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 27, humidity: 9 } }
                                ]
                            }, 
                            { 
                                name: "Κουζίνα",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR1', protocol: 'mqtt', state: 'OPEN' },
                                    { name: 'Παράθυρο διπλό', domain: 'WINDOW', type: 'WINDOW2R', protocol: 'mqtt', state: { left: 'CLOSED', right: 'CLOSED', recline: 'CLOSED' } },
                                    { name: 'Παράθυρο μονό', domain: 'WINDOW', type: 'WINDOW1R', protocol: 'mqtt', state: { main: 'CLOSED', recline: 'OPEN' } },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'ON' },
                                    { name: 'Σποτ', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Φως μπαλκονιού', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 29, humidity: 36 } }
                                ]
                            }, 
                            { 
                                name: "Μπάνιο",
                                items: [
                                    { name: 'Παράθυρο', domain: 'WINDOW', type: 'WINDOW1', protocol: 'mqtt', state: 'OPEN' },
                                    { name: 'Φως', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 28, humidity: 35 } }
                                ]
                            }, 
                            { 
                                name: "Γραφείο",
                                items: [
                                    { name: 'Μπαλκονόπορτα', domain: 'DOOR', type: 'DOOR1', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Σίτα μπαλκονόπορτας', domain: 'COVER', type: 'NET', protocol: 'mqtt', state: 'CLOSED' },
                                    { name: 'Ρολό μπαλκονόπορτας', domain: 'COVER', type: 'ROLLER1_AUTO', protocol: 'mqtt', state: { main: 'CLOSED', percent: 100 } },
                                    { name: 'Φως ταβάνι', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Φως μπαλκονιού', domain: 'LIGHT', type: 'LIGHT', protocol: 'mqtt', state: 'OFF' },
                                    { name: 'Κάμερα', domain: 'CAMERA', type: 'IPCAMERA', protocol: 'http' },
                                    { name: 'Θερμοκρασία', domain: 'CLIMATE', type: 'TEMPERATURE_HUMIDITY', protocol: 'mqtt', state: { temperature: 26, humidity: 27 } }
                                ]
                            } 
                        ] 
                    } 
                ],
                items: [ { name: 'Συναγερμός', domain: 'ALARM', type: 'ALARM', protocol: 'mqtt' } ]
            }
        ]
        };
        return service;
*/
    }
})();
