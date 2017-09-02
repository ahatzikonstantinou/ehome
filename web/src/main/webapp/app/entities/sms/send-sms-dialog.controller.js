(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('SendSmsDialogController', SendSmsDialogController);

    SendSmsDialogController.$inject = ['$timeout', '$scope', '$stateParams', '$uibModalInstance', 'smsDevice' ];

    function SendSmsDialogController ($timeout, $scope, $stateParams, $uibModalInstance, smsDevice ) {
        var vm = this;

        var MAX_SMS_CHARS = 160;
        vm.smsDevice = smsDevice;
        console.log( vm.smsDevice );

        vm.modem = null;
        if( vm.smsDevice.modems.length > 0 )
        {
            vm.modem = vm.smsDevice.modems[0];
        }

        vm.to = '';
        vm.text = '';
        
        vm.clear = clear;
        vm.send = send;
        vm.countSms = countSms;
        vm.countRemainingChars = countRemainingChars;


        $timeout(function (){
            angular.element('.form-group:eq(1)>input').focus();
        });

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function send () {
            vm.isSending = true;
            vm.smsDevice.sendSms( vm.modem, vm.to, vm.text );
            $uibModalInstance.close();
            vm.isSending = false;
        }

        function countRemainingChars()
        {
            // console.log( 'vm.text: ', vm.text );
            if( ! vm.text || vm.text.length == 0 )
            {
                return MAX_SMS_CHARS;
            }
            return MAX_SMS_CHARS - ( vm.text.length % MAX_SMS_CHARS );
        }

        function countSms()
        {
            if( ! vm.text || vm.text.length == 0 )
            {
                return 0;
            }

            return Math.floor( vm.text.length / MAX_SMS_CHARS );
        }

    }
})();
