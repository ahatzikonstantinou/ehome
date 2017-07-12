(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'door1', function()
        {
            return {             
                // transclude: true,   
                restrict: 'E',
                scope: { 
                    i: '=item',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/items/door1.html',
                // link: function( scope, element, attrs )
                // {
                //     scope.$watch( 'i', function(){
                //         console.log( scope.i );
                //     } )
                //     scope.$watch( 'i.device', function(){
                //         console.log( scope.i.device );
                //     } )
                // }
            };
        }
        );
})();
