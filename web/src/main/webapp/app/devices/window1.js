(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Window1', Window1);

    Window1.$inject = [];

    function Window1() {
        //Constructor
        function Window1( mqtt_subscribe_topic, state )
        {
            //public properties
            MqttDevice.call( this, mqtt_subscribe_topic, state );
        }
        
        Window1.prototype = Object.create( MqttDevice.prototype );
        Window1.prototype.constructor = Window1;

        return Window1;
    }
})();
