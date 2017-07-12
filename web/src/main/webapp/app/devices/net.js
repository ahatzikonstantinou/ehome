(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Net', Net);

    Net.$inject = [];

    function Net() {
        //Constructor
        function Net( mqtt_subscribe_topic, state )
        {
            //public properties
            MqttDevice.call( this, mqtt_subscribe_topic, state );
        }
        
        Net.prototype = Object.create( MqttDevice.prototype );
        Net.prototype.constructor = Net;

        return Net;
    }
})();
