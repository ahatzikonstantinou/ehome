(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerSettingsDialogController', ServerSettingsDialogController);

        ServerSettingsDialogController.$inject = ['$timeout', '$scope', '$rootScope', '$stateParams', '$uibModalInstance', 'server' ];

    function ServerSettingsDialogController ($timeout, $scope, $rootScope, $stateParams, $uibModalInstance, server ) {
        var vm = this;
        vm.server = {
            id: server.id,
            name: server.name,
            type: server.type,
            settings: server.settings,
            connection: server.connection,
            failover: server.failover
        };

        // console.log( 'server:', vm.server );
        
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
            try
            {
                localStorage.setItem( 'server_' + vm.server.id, angular.toJson( vm.server ) );
                onSaveSuccess( vm.server );
            }
            catch( error )
            {
                onSaveError();
            }
        }

        function onSaveSuccess (result) {
            $rootScope.$emit('server-settings:update', result);
            $uibModalInstance.close(result);
            vm.isSaving = false;
        }

        function onSaveError () {
            vm.isSaving = false;
        }

    }
})();
