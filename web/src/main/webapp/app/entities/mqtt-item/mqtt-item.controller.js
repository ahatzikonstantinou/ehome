(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('MqttItemController', MqttItemController);

    MqttItemController.$inject = ['MqttItem'];

    function MqttItemController(MqttItem) {

        var vm = this;

        vm.mqttItems = [];

        loadAll();

        function loadAll() {
            MqttItem.query(function(result) {
                vm.mqttItems = result;
                vm.searchQuery = null;
            });
        }
    }
})();
