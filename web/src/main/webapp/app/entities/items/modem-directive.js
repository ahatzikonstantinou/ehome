(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'modem', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/modem.html'
            };
        }
        );
})();
