(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Window1', Window1);

    Window1.$inject = [];

    function Window1() {
        //Constructor
        function Window1( mqtt_publish_topic, state, scope )
        {
            //public properties
            MqttDevice.call( this, mqtt_publish_topic, state, scope );
        }
        
        Window1.prototype = Object.create( MqttDevice.prototype );
        Window1.prototype.constructor = Window1;

        return Window1;
    }
})();
