(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'ipcamera', function()
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
                templateUrl: '/app/entities/items/ipcamera.html'
            };
        }
        );
})();
