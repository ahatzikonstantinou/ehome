(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Window2R', Window2R);

    Window2R.$inject = [];

    function Window2R() {
        //Constructor
        function Window2R( mqtt_subscribe_topic, state, scope )
        {
            //public properties
            MqttDevice.call( this, mqtt_subscribe_topic, state, scope );
        }
        
        Window2R.prototype = Object.create( MqttDevice.prototype );
        Window2R.prototype.constructor = Window2R;

        return Window2R;
    }
})();
