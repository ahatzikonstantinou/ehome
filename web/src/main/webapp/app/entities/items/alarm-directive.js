(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'alarm', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/alarm.html'
            };
        }
        );
})();
