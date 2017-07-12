(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'motionCameraPanTilt', ['$http', function( $http )
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
                templateUrl: '/app/entities/items/motionCameraPanTilt.html',
                link: function( $scope, element, attr )
                {
                    $scope.$http = $http;
                }
            };
        }
        ]);
})();
