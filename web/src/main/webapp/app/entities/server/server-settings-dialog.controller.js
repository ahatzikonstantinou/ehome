(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerSettingsDialogController', ServerSettingsDialogController);

        ServerSettingsDialogController.$inject = ['$timeout', '$scope', '$rootScope', '$stateParams', '$uibModalInstance', '$uibModal', 'server' ];

    function ServerSettingsDialogController ($timeout, $scope, $rootScope, $stateParams, $uibModalInstance, $uibModal, server ) {
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
        vm.deleteServer = deleteServer;

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
                if( !vm.server.id )
                {
                    vm.server.id = uuidv4();
                }
                localStorage.setItem( 'server_' + vm.server.id, angular.toJson( vm.server ) );
                onSaveSuccess( vm.server );
            }
            catch( error )
            {
                onSaveError();
            }
        }

        function onSaveSuccess (result) {
            $uibModalInstance.close(result);
            vm.isSaving = false;
            $rootScope.$emit('server-settings:update', result);
        }

        function onSaveError () {
            vm.isSaving = false;
        }

        function deleteServer ()
        {
            $uibModal.open({
                templateUrl: 'app/entities/server/server-delete-dialog.html',
                controller: 'ServerDeleteController',
                controllerAs: 'vm',
                size: 'md',
                resolve: {
                    server: function() {
                        return vm.server;
                    }
                }
            }).result.then(function() {
                onDelete();
            });
        }

        function onDelete()
        {
            console.log( 'Deleting...' );
            vm.isSaving = true;
            try
            {
                if( !vm.server.id )
                {
                    console.error( 'Cannot delete a server that has no id' );
                }
                var deletedId = vm.server.id;
                localStorage.removeItem( 'server_' + vm.server.id );
                onDeleteSuccess( deletedId );
            }
            catch( error )
            {
                onSaveError();
            }
        }

        function onDeleteSuccess( deletedId )
        {
            $uibModalInstance.close( deletedId );
            vm.isSaving = false;
            $rootScope.$emit('server-settings:deleted', deletedId);
        }

    }
})();
