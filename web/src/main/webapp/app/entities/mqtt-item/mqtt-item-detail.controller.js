(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('MqttItemDetailController', MqttItemDetailController);

    MqttItemDetailController.$inject = ['$scope', '$rootScope', '$stateParams', 'previousState', 'entity', 'MqttItem'];

    function MqttItemDetailController($scope, $rootScope, $stateParams, previousState, entity, MqttItem) {
        var vm = this;

        vm.mqttItem = entity;
        vm.previousState = previousState.name;

        var unsubscribe = $rootScope.$on('eHomeApp:mqttItemUpdate', function(event, result) {
            vm.mqttItem = result;
        });
        $scope.$on('$destroy', unsubscribe);
    }
})();
