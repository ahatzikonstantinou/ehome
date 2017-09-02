(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'sms', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/sms.html'
            };
        }
        );
})();
