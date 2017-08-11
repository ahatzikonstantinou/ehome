(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'server', function()
            {
                return {
                    transclude: true,
                    restrict: 'E',
                    controller: 'ServerController',
                    controllerAs: 'vm',
                    scope: { 
                        server: '=server'
                    },
                    templateUrl: '/app/entities/server/server.html'
                };
            }
        );
})();
