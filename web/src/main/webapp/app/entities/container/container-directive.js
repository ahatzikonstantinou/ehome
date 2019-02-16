(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .directive( 'container', function()
        {
            return {
                transclude: true,
                restrict: 'E',
                scope: { 
                    c: '=container',
                    level: '=',
                    showLabel: '=',
                    isCollapsed: '=',
                    expandAllChildren: '&expandAllChildren',
                    filter: '=',
                    showMqttTopics: '='
                },
                templateUrl: '/app/entities/container/container.html'
            };
        }
        );
})();
