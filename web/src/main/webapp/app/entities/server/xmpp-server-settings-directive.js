(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'xmppServerSettings', function()
            {
                return {
                    // transclude: true,
                    restrict: 'E',
                    scope: { 
                        server: '=server',
                        required: '=',
                        fieldNamePrefix: '=',
                        editForm: '=form'
                    },
                    templateUrl: '/app/entities/server/xmpp-server-settings.html'
                };
            }
        );
})();
