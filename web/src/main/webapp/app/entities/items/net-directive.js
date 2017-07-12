(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'net', function()
        {
            return {                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/net.html'
            };
        }
        );
})();
