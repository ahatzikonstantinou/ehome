(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Window1R', Window1R);

    Window1R.$inject = [];

    function Window1R() {
        //Constructor
        function Window1R( mqtt_subscribe_topic, state, scope )
        {
            //public properties
            MqttDevice.call( this, mqtt_subscribe_topic, state, scope );
        }
        
        Window1R.prototype = Object.create( MqttDevice.prototype );
        Window1R.prototype.constructor = Window1R;

        return Window1R;
    }
})();
