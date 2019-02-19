(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerDeleteController',ServerDeleteController);

    ServerDeleteController.$inject = ['$uibModalInstance', 'server'];

    function ServerDeleteController($uibModalInstance, server) {
        var vm = this;

        vm.server = server;
        vm.clear = clear;
        vm.confirmDelete = confirmDelete;

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function confirmDelete (id) {
            $uibModalInstance.close(true);
        }
    }
})();
