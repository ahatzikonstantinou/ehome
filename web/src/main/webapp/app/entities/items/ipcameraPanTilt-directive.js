(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'ipcameraPanTilt', ['$http', function( $http )
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
                templateUrl: '/app/entities/items/ipcameraPanTilt.html',
                link: function( $scope, element, attr )
                {
                    $scope.$http = $http;
                }
            };
        }
        ]);
})();
