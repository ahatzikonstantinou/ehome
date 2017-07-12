(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'temphum', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/temphum.html'
            };
        }
        );
})();
