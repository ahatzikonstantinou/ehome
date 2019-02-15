(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('TemperatureHumidity', TemperatureHumidity);

    TemperatureHumidity.$inject = [];

    function TemperatureHumidity() {
        //Constructor
        function TemperatureHumidity( mqtt_publish_topic, state, scope )
        {
            //public properties
            MqttDevice.call( this, mqtt_publish_topic, state, scope );
        }
        
        TemperatureHumidity.prototype = Object.create( MqttDevice.prototype );
        TemperatureHumidity.prototype.constructor = TemperatureHumidity;

        return TemperatureHumidity;
    }
})();
