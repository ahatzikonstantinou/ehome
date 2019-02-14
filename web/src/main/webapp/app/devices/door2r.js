(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Door2R', Door2R);

    Door2R.$inject = [];

    function Door2R() {
        //Constructor
        function Door2R( mqtt_subscribe_topic, state, scope )
        {
            //public properties
            MqttDevice.call( this, mqtt_subscribe_topic, state, scope );
        }
        
        Door2R.prototype = Object.create( MqttDevice.prototype );
        Door2R.prototype.constructor = Door2R;

        return Door2R;
    }
})();
