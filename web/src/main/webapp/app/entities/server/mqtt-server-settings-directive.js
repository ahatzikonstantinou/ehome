(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'mqttServerSettings', function()
            {
                return {
                    // transclude: true,
                    restrict: 'E',
                    // controller: 'ServerSettingsDialogController',
                    // controllerAs: 'vm',
                    scope: { 
                        server: '=server',
                        required: '=',
                        editForm: '=form'
                    },
                    templateUrl: '/app/entities/server/mqtt-server-settings.html'
                };
            }
        );
})();
