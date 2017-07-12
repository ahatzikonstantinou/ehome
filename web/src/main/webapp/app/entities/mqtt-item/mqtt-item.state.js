(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .config(stateConfig);

    stateConfig.$inject = ['$stateProvider'];

    function stateConfig($stateProvider) {
        $stateProvider
        .state('mqtt-item', {
            parent: 'entity',
            url: '/mqtt-item',
            data: {
                authorities: ['ROLE_USER'],
                pageTitle: 'eHomeApp.mqttItem.home.title'
            },
            views: {
                'content@': {
                    templateUrl: 'app/entities/mqtt-item/mqtt-items.html',
                    controller: 'MqttItemController',
                    controllerAs: 'vm'
                }
            },
            resolve: {
                translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                    $translatePartialLoader.addPart('mqttItem');
                    $translatePartialLoader.addPart('global');
                    return $translate.refresh();
                }]
            }
        })
        .state('mqtt-item-detail', {
            parent: 'mqtt-item',
            url: '/mqtt-item/{id}',
            data: {
                authorities: ['ROLE_USER'],
                pageTitle: 'eHomeApp.mqttItem.detail.title'
            },
            views: {
                'content@': {
                    templateUrl: 'app/entities/mqtt-item/mqtt-item-detail.html',
                    controller: 'MqttItemDetailController',
                    controllerAs: 'vm'
                }
            },
            resolve: {
                translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
                    $translatePartialLoader.addPart('mqttItem');
                    return $translate.refresh();
                }],
                entity: ['$stateParams', 'MqttItem', function($stateParams, MqttItem) {
                    return MqttItem.get({id : $stateParams.id}).$promise;
                }],
                previousState: ["$state", function ($state) {
                    var currentStateData = {
                        name: $state.current.name || 'mqtt-item',
                        params: $state.params,
                        url: $state.href($state.current.name, $state.params)
                    };
                    return currentStateData;
                }]
            }
        })
        .state('mqtt-item-detail.edit', {
            parent: 'mqtt-item-detail',
            url: '/detail/edit',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/mqtt-item/mqtt-item-dialog.html',
                    controller: 'MqttItemDialogController',
                    controllerAs: 'vm',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        entity: ['MqttItem', function(MqttItem) {
                            return MqttItem.get({id : $stateParams.id}).$promise;
                        }]
                    }
                }).result.then(function() {
                    $state.go('^', {}, { reload: false });
                }, function() {
                    $state.go('^');
                });
            }]
        })
        .state('mqtt-item.new', {
            parent: 'mqtt-item',
            url: '/new',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/mqtt-item/mqtt-item-dialog.html',
                    controller: 'MqttItemDialogController',
                    controllerAs: 'vm',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        entity: function () {
                            return {
                                topic: null,
                                state: null,
                                id: null
                            };
                        }
                    }
                }).result.then(function() {
                    $state.go('mqtt-item', null, { reload: 'mqtt-item' });
                }, function() {
                    $state.go('mqtt-item');
                });
            }]
        })
        .state('mqtt-item.edit', {
            parent: 'mqtt-item',
            url: '/{id}/edit',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/mqtt-item/mqtt-item-dialog.html',
                    controller: 'MqttItemDialogController',
                    controllerAs: 'vm',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        entity: ['MqttItem', function(MqttItem) {
                            return MqttItem.get({id : $stateParams.id}).$promise;
                        }]
                    }
                }).result.then(function() {
                    $state.go('mqtt-item', null, { reload: 'mqtt-item' });
                }, function() {
                    $state.go('^');
                });
            }]
        })
        .state('mqtt-item.delete', {
            parent: 'mqtt-item',
            url: '/{id}/delete',
            data: {
                authorities: ['ROLE_USER']
            },
            onEnter: ['$stateParams', '$state', '$uibModal', function($stateParams, $state, $uibModal) {
                $uibModal.open({
                    templateUrl: 'app/entities/mqtt-item/mqtt-item-delete-dialog.html',
                    controller: 'MqttItemDeleteController',
                    controllerAs: 'vm',
                    size: 'md',
                    resolve: {
                        entity: ['MqttItem', function(MqttItem) {
                            return MqttItem.get({id : $stateParams.id}).$promise;
                        }]
                    }
                }).result.then(function() {
                    $state.go('mqtt-item', null, { reload: 'mqtt-item' });
                }, function() {
                    $state.go('^');
                });
            }]
        });
    }

})();
