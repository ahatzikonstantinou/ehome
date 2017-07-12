(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'roller1auto', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/roller1_auto.html'
            };
        }
        );
})();
