(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'window1r', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/window1r.html'
            };
        }
        );
})();
