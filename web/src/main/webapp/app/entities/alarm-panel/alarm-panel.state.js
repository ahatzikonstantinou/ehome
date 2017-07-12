(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .config(stateConfig);

    stateConfig.$inject = ['$stateProvider'];

    function stateConfig($stateProvider) {
        $stateProvider
        .state('alarm-panel', {
            parent: 'entity',
            url: '/alarm-panel?topic=',
            data: {
                authorities: [],
                pageTitle: 'eHomeApp.alarm-panel.title'
            },
            params: {
                topic: { raw: true }
            },
            views: {
                'content@': {
                    templateUrl: 'app/entities/alarm-panel/alarm-panel.html',
                    controller: 'AlarmPanelController',
                    controllerAs: 'vm'
                }
            },
            resolve: {
                translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate,$translatePartialLoader) {
                    $translatePartialLoader.addPart('home');
                    return $translate.refresh();
                }],
                topic: [ '$stateParams', function( $stateParams ){
                    return $stateParams.topic;
                }]
            }
        });
    }
})();
