(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('MqttItemDialogController', MqttItemDialogController);

    MqttItemDialogController.$inject = ['$timeout', '$scope', '$stateParams', '$uibModalInstance', 'entity', 'MqttItem'];

    function MqttItemDialogController ($timeout, $scope, $stateParams, $uibModalInstance, entity, MqttItem) {
        var vm = this;

        vm.mqttItem = entity;
        vm.clear = clear;
        vm.save = save;

        $timeout(function (){
            angular.element('.form-group:eq(1)>input').focus();
        });

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function save () {
            vm.isSaving = true;
            if (vm.mqttItem.id !== null) {
                MqttItem.update(vm.mqttItem, onSaveSuccess, onSaveError);
            } else {
                MqttItem.save(vm.mqttItem, onSaveSuccess, onSaveError);
            }
        }

        function onSaveSuccess (result) {
            $scope.$emit('eHomeApp:mqttItemUpdate', result);
            $uibModalInstance.close(result);
            vm.isSaving = false;
        }

        function onSaveError () {
            vm.isSaving = false;
        }


    }
})();
