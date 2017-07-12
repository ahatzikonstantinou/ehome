(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'door2r', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/door2r.html'
            };
        }
        );
})();
