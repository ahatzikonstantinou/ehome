(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Sms', Sms);

    Sms.$inject = [ '$uibModal' ];

    function Sms( $uibModal ) {
        //Constructor
        function Sms( mqtt_subscribe_topic, mqtt_publish_topic, state, $timeout )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state, mqtt_publish_topic );
            this.listCmd = '{"cmd":"list", "params":{ "lastSms":#lastSms#, "updates": []} }';
            this.allowedDestinationsCmd = '{"cmd":"allowed_destinations"}';
            this.modems = [];
            this.deleteSmsList=[];
            this.messages = [];
            this.allowedDestinations = [];

            var smsList = localStorage.getItem( 'smsList' );
            if( smsList )
            {
                try
                {
                    this.messages = angular.fromJson( smsList );
                }
                catch( error )
                {
                    console.log( 'Error json-parsing raw sms list:', rawSmsList, '. Error:', error );
                }
            }
            /*
            this.messages = [{
                "modem": "2",
                "id": "62",
                "timestamp": "2013-02-28T11:16:42+0200",
                "number": "COSMOTE",
                "state": "received",
                "text": "ΣAΣ ENHMEPΩNOYME OTI EKΔOΘHKE O ΛOΓAPIAΣMOΣ ΣAΣ. TO ΠOΣO EINAI 4,79 EYPΩ KAI MΠOPEITE NA TO EΞOΦΛHΣETE EΩΣ 26/03/2013 ΣTO ΔIKTYO ΠΩΛHΣEΩN THΣ COSMOTE.ΓIA EΞOΦΛHΣH ΣE TPAΠEZA XPEIAZEΣTE TON KΩΔ.ΠΛHPΩMHΣ 00153384502201331021 KAI ΓIA ENEPΓOΠOIHΣH ΠAΓIAΣ ENTOΛHΣ TPAΠEZAΣ TON KΩΔ.ANAΘEΣHΣ 00000000206710431019",
                "type": "deliver",
                "reference": "",
                "delivery": ""
              },{
                "modem": "2",
                "id": "63",
                "timestamp": "2017-07-29T23:37:24+0300",
                "number": "+306974931327",
                "state": "received",
                "text": "Testing 3H ΔOKIMH ",
                "type": "deliver",
                "reference": "",
                "delivery": ""
              },{
                "modem": "2",
                "id": "64",
                "timestamp": "2017-07-31T15:49:00+0300",
                "number": "+306974931327",
                "state": "received",
                "text": "ΣOY EBΓAΛA 640€ ΓIATI XPEIAZOMOYN KI EΓΩ 200€. ΣTO ΛOΓAPIAΣMO ΣOY EMEINAN 482€.",
                "type": "deliver",
                "reference": "",
                "delivery": ""
              },{
                "modem": "2",
                "id": "65",
                "timestamp": "2017-08-23T16:14:53+0300",
                "number": "+306974931327",
                "state": "received",
                "text": "ΔOKIMH AΠOΣTOΛH ΣTIΣ 2017-08-23 16:14",
                "type": "deliver",
                "reference": "",
                "delivery": ""
              },{
                "modem": "2",
                "id": "66",
                "timestamp": "2017-08-28T12:02:44+0300",
                "number": "COSMOTE",
                "state": "received",
                "text": "KAΛEΣTE 11888 ΓIA OΛA TA ΔHMOΣIA/IΔIΩTIKA ΣXOΛEIA, KOΛΛEΓIA & ΦPONTIΣTHPIA. 11888, ΣOYΠEP APIΘMOΣ! XP.KΛHΣHΣ 1,19€/ΛEΠTO. http://f.cosmotemyview.gr/11888",
                "type": "deliver",
                "reference": "",
                "delivery": ""
              },{
                "modem": "2",
                "id": "67",
                "timestamp": "2017-08-30T04:12:42+0300",
                "number": "+306974931327",
                "state": "received",
                "text": "reboot",
                "type": "deliver",
                "reference": "",
                "delivery": ""
              },{
                "modem": "2",
                "id": "68",
                "timestamp": "",
                "number": "6974931327",
                "state": "sent",
                "text": "Δοκιμαστική αποστολή sms 30 Αυγούστου 18:53",
                "type": "submit",
                "reference": "56",
                "delivery": ""
              },{
                "modem": "2",
                "id": "70",
                "timestamp": "2017-08-30T18:55:52+0300",
                "number": "6974931327",
                "state": "received\ncompleted-received",
                "text": "",
                "type": "status-report",
                "reference": "56",
                "delivery": "completed-received"
              },{
                "modem": "2",
                "id": "71",
                "timestamp": "",
                "number": "6974931327",
                "state": "sent",
                "text": "Δοκιμαστική αποστολή (χωρίς delivery report) sms 30 Αυγούστου 18:53",
                "type": "submit",
                "reference": "57",
                "delivery": ""
              },{
                "modem": "2",
                "id": "72",
                "timestamp": "",
                "number": "6974931327",
                "state": "sent",
                "text": "Δοκιμαστική αποστολή (χωρίς καθόλου specification για delivery report) sms 30 Αυγούστου 18:53",
                "type": "submit",
                "reference": "59",
                "delivery": ""
              }];
            */
            
            var allowedDestinations = localStorage.getItem( 'smsAllowedDestinations' );
            if( allowedDestinations )
            {
                try
                {
                    this.allowedDestinations = angular.fromJson( allowedDestinations );
                }
                catch( error )
                {
                    console.log( 'Error json-parsing raw sms allowedDestinations:', rawSmsList, '. Error:', error );
                }
            }
        }
        
        Sms.prototype = Object.create( MqttDevice.prototype );
        Sms.prototype.constructor = Sms;

        Sms.prototype.setPublisher = function( publisher )
        {
            MqttDevice.prototype.setPublisher.call( this, publisher );
            this.refresh();
            
            //ahat Note: if i try to send another mqtt message here, immediately after the refresh message
            // e.g. getAllowedDestinations, the second mqtt message seems to somehow get lost or be ignored by the sms.sh script
            // which is obviously related with the sleep delay of the while true loop that listens for incoming mqtt messages
        }

        Sms.prototype.newSmsCount = function()
        {
            var count = 0;
            for( var i = 0 ; i < this.messages.length ; i++ )
            {
                if( this.messages[i].new )
                {
                    count++;
                }
            }
            return count;
        }

        Sms.prototype.update = function( topic, message )
        {
            if( MqttDevice.prototype.update.call( this, topic, message ) )
            {
                var data = angular.fromJson( this.state );
                if( data.existing )
                {
                    for( var i = 0 ; i < data.existing.length ; i++ )
                    {
                        data.existing[i].new = true;
                        var found = false;
                        for( var m = 0 ; m < this.messages.length ; m++ )
                        {
                            if( this.messages[m].id == data.existing[i].id )
                            {
                                found = true;
                                this.messages[m] = data.existing[i];
                            }
                        }
                        if( !found )
                        {                            
                            this.messages.push( data.existing[i] );
                        }
                    }

                    //resolve status-reports i.e. update its text to the reference message text
                    for( var i = 0 ; i < this.messages.length ; i++ )
                    {
                        if( this.messages[i].type == 'status-report' && this.messages[i].new )
                        {
                            for( var r = 0 ; r < this.messages.length ; r++ )
                            {
                                if( this.messages[r].type == 'submit' && this.messages[i].reference == this.messages[r].reference )
                                {
                                    this.messages[i].text = this.messages[r].text;
                                    break;
                                }
                            }
                        }
                    }
                }

                if( data.deleted )
                {
                    for( var i = 0 ; i < data.deleted.length ; i++ )
                    {
                        var found = false;
                        for( var m = 0 ; m < this.messages.length ; m++ )
                        {
                            if( this.messages[m].id == data.deleted[i].id )
                            {
                                console.log( 'Sms deleting sms: ', this.messages[m] );
                                this.messages.splice( m, 1 );                                
                                break;
                            }
                        }
                    }
                }

                if( data.existing || data.deleted )
                {
                    localStorage.setItem( 'smsList', JSON.stringify( this.messages ) );
                }

                if( data.allowed_destinations )
                {
                    this.allowedDestinations = data.allowed_destinations;
                    console.log( 'Sms allowedDestinations: ', this.allowedDestinations );
                    localStorage.setItem( 'smsAllowedDestinations', JSON.stringify( this.allowedDestinations ) );
                }
            }
        }

        Sms.prototype.getAllowedDestinations = function()
        {
            //send a message to retrieve sms list
            var message = new Paho.MQTT.Message( this.allowedDestinationsCmd );
            message.destinationName = this.mqtt_publish_topic ;
            message.qos = 2;
            console.log( 'Sms sending getAllowedDestinations message: ', message );
            this.publisher.send( message );
        }

        Sms.prototype.cleanRefresh = function()
        {
            this.messages = [];
            localStorage.setItem( 'smsList', JSON.stringify( this.messages ) );
            this.refresh();
        }
        
        Sms.prototype.refresh = function()
        {
            //send a message to retrieve sms list
            var message = new Paho.MQTT.Message( this.listCmd.replace( '#lastSms#', this._lastSmsId() ).replace( '[]', '['+ this._getPendingSmsIds() + ']' ) );
            message.destinationName = this.mqtt_publish_topic ;
            message.qos = 2;
            console.log( 'Sms sending message: ', message );
            this.publisher.send( message );
        }

        Sms.prototype.updateDelete = function( smsId, add )
        {
            for( var i = 0 ; i < this.deleteSmsList.length ; i++ )
            {   
                if( this.deleteSmsList[i] == smsId )
                {
                    if( add )
                    {
                        return;
                    }
                    else
                    {
                        this.deleteSmsList.splice( i, 1 );
                        return;
                    }
                }
            }
            this.deleteSmsList.push( smsId );
        }

        Sms.prototype.delete = function( deleteSmsList )
        {
            if( this.deleteSmsList.length == 0 )
            {
                return;
            }

            var ids = "";
            for( var i = 0 ; i < this.deleteSmsList.length ; i++ )
            {
                ids += ( ids.length > 0 ? ',' : '' ) + this.deleteSmsList[i];
            }

            var message = new Paho.MQTT.Message( '{ "cmd":"delete", "params":{ "smsIdList":[' + ids + '] } }' );
            message.destinationName = this.mqtt_publish_topic ;
            console.log( 'Sms sending message: ', message );
            this.publisher.send( message );
        }

        Sms.prototype._lastSmsId = function()
        {
            var lastSms = -1;
            for( var i = 0 ; i < this.messages.length ; i++ )
            {
                if( this.messages[i].id > lastSms )
                {
                    lastSms = this.messages[i].id;
                }
            }
            return lastSms;
        }

        Sms.prototype._getPendingSmsIds = function()
        {
            var pending = "";
            for( var i = 0 ; i < this.messages.length ; i++ )
            {
                if( this.messages[i].state.indexOf( "received" ) == -1 && this.messages[i].state.indexOf( "sent" ) == -1 )
                {
                    pending += ( pending.length > 0 ? ", " : "" ) + this.messages[i].id;
                }
            }
            return pending;
        }

        Sms.prototype.clearNew = function( clear )
        {
            if( clear )
            {
                for( var i = 0 ; i < this.messages.length ; i++ )
                {
                    this.messages[i].new = false;
                }
                localStorage.setItem( 'smsList', JSON.stringify( this.messages ) );
            }
        }

        Sms.prototype.openSendDialog = function( smsDevice )
        {
            // console.log( 'openSendDialog modems: ', modems, ' this.modems: ', this.modems );
            if( this.publisher )
            {
                this.getAllowedDestinations();
            }

            $uibModal.open({
                templateUrl: 'app/entities/sms/send-sms-dialog.html',
                controller: 'SendSmsDialogController',
                controllerAs: 'vm',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    smsDevice: function() { return smsDevice; },
                    
                    translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate,$translatePartialLoader) {
                        $translatePartialLoader.addPart('sms');
                        return $translate.refresh();
                    }]
                }
            }).result.then(function() {
                console.log( 'success' );
            }, function() {
                console.log( 'failure' );
            });
        }

        Sms.prototype.sendSms = function( modem, to, text )
        {
            // var cmd = '{"cmd":"send", "params":{ "modem": ' + modem.id + ', "to":"' + to + '", "text": ' + JSON.stringify( text ) + ' } }'
            var cmd = '{"cmd":"send", "params":{ "modem": ' + modem.id + ', "to":"' + to + '", "text": ' + angular.toJson( text ) + ' } }'
            console.log( 'Sms will send the mqtt command: ', cmd );

            var message = new Paho.MQTT.Message( cmd );
            message.destinationName = this.mqtt_publish_topic ;
            message.qos = 2;
            console.log( 'Sms sending message: ', message );
            this.publisher.send( message );
        }

        Sms.prototype.setModemUpdater = function( modemUpdater )
        {
            modemUpdater.addModemObserver( this );
        }

        Sms.prototype.updateModems = function( modems )
        {
            this.modems = modems;
        }

        return Sms;
    }
})();
