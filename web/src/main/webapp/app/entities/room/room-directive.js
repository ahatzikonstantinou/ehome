(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'room', function()
        {
            return {
                transclude: true,
                restrict: 'E',
                scope: { 
                    r: '=room',
                    showLabel: '=',
                    isCollapsed: '=',
                    isCollapsedHouse: '=',
                    isCollapsedFloor: '=',
                    filter: '=',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/room/room.html'
            };
        }
        );
})();
