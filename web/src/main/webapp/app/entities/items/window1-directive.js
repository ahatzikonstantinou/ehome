(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'window1', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/window1.html'
            };
        }
        );
})();
