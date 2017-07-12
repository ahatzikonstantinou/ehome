(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'item', function()
        {
            return {
                transclude: true,
                restrict: 'E',
                scope: { 
                    i: '=item',
                    filter: '=',
                    showMqttTopics: '=',
                    isCollapsedHouse: '=',
                    isCollapsedFloor: '=',
                    isCollapsedRoom: '='
                },
                templateUrl: '/app/entities/item/item.html'
            };
        }
        );
})();
