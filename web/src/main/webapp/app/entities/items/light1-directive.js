(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'light1', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/light1.html'
            };
        }
        );
})();
