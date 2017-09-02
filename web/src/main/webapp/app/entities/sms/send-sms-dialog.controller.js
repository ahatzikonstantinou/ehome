(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('SendSmsDialogController', SendSmsDialogController);

    SendSmsDialogController.$inject = ['$timeout', '$scope', '$stateParams', '$uibModalInstance', 'modems'];

    function SendSmsDialogController ($timeout, $scope, $stateParams, $uibModalInstance, modems) {
        var vm = this;

        vm.clear = clear;
        vm.send = send;
        vm.countSms = countSms;

        vm.sms = { text: '' };

        $timeout(function (){
            angular.element('.form-group:eq(1)>input').focus();
        });

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function send () {
            vm.isSending = true;
            // if (vm.mqttItem.id !== null) {
            //     MqttItem.update(vm.mqttItem, onSaveSuccess, onSaveError);
            // } else {
            //     MqttItem.save(vm.mqttItem, onSaveSuccess, onSaveError);
            // }
        }

        function onSaveSuccess (result) {
            $scope.$emit('eHomeApp:sendSms', result);
            $uibModalInstance.close(result);
            vm.isSending = false;
        }

        function onSaveError () {
            vm.isSending = false;
        }

        function countSms()
        {
            return Math.floor( vm.sms.text.length / 160 );
        }
    }
})();
