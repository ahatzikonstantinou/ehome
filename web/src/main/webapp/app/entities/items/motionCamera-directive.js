(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'motionCamera', function()
        {
            return {
                
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '=',
                    isCollapsedHouse: '=',
                    isCollapsedFloor: '=',
                    isCollapsedRoom: '='
                },
                templateUrl: '/app/entities/items/motionCamera.html'
            };
        }
        );
})();
