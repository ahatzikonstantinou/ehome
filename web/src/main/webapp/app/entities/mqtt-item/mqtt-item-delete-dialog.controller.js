(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('MqttItemDeleteController',MqttItemDeleteController);

    MqttItemDeleteController.$inject = ['$uibModalInstance', 'entity', 'MqttItem'];

    function MqttItemDeleteController($uibModalInstance, entity, MqttItem) {
        var vm = this;

        vm.mqttItem = entity;
        vm.clear = clear;
        vm.confirmDelete = confirmDelete;

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function confirmDelete (id) {
            MqttItem.delete({id: id},
                function () {
                    $uibModalInstance.close(true);
                });
        }
    }
})();
