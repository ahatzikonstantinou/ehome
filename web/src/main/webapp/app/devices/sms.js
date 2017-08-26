(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Sms', Sms);

    Sms.$inject = [];

    function Sms() {
        //Constructor
        function Sms( mqtt_subscribe_topic, state )
        {
            MqttDevice.call( this, mqtt_subscribe_topic, state );
            this.messages = [];
            var rawSmsList = localStorage.getItem( 'sms' );
            if( rawSmsList )
            {
                try
                {
                    this.messages = angular.fromJson( rawSmsList );
                }
                catch( error )
                {
                    console.log( 'Error json-parsing raw sms:', rawSmsList, '. Error:', error );
                }
            }
        }
        
        Sms.prototype = Object.create( MqttDevice.prototype );
        Sms.prototype.constructor = Sms;

        Sms.prototype.update = function( topic, message )
        {
            if( MqttDevice.prototype.update.call( this, topic, message ) )
            {

            }
        }

        return Sms;
    }
})();
