(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('Door1', Door1);

    Door1.$inject = [];

    function Door1() {
        //Constructor
        function Door1( mqtt_publish_topic, state, scope )
        {
            MqttDevice.call( this, mqtt_publish_topic, state, scope );
        }
        
        Door1.prototype = Object.create( MqttDevice.prototype );
        Door1.prototype.constructor = Door1;

        return Door1;
    }
})();
