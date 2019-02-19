(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerController', ServerController);

    // ServerController.$inject = ['$scope', 'Principal', 'LoginService', '$state'];
    ServerController.$inject = [ '$scope', 'Configuration', 'Server', 'ServerConnection', 'ServerConfiguration', '$uibModal' ];

    // function ServerController ($scope, Principal, LoginService, $state) {
    function ServerController( $scope, Configuration, Server, ServerConnection, ServerConfiguration, $uibModal ) {
        var vm = this;
        vm.server = $scope.server;
        vm.scope = $scope;
        
        vm.account = null;
        vm.isAuthenticated = true; //null;

        // vm.login = LoginService.open;
        // vm.register = register;
        // $scope.$on('authenticationSuccess', function() {
        //     getAccount();
        // });

        // getAccount();

        // function getAccount() {
        //     Principal.identity().then(function(account) {
        //         vm.account = account;
        //         vm.isAuthenticated = Principal.isAuthenticated;
        //     });
        // }
        // function register () {
        //     $state.go('register');
        // }

        vm.container = null;

        Server.init( vm.server, updateConfiguration, removeConf );

        function updateConfiguration( server, messagePayloadString, withoutScopeApply )
        {
            // if( ( server.houses && server.houses.length > 0 ) || ( vm.houses && vm.houses.length > 0 ) )
            // {
            //     console.log( 'before unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            //     server.unsubscribeConf(); //server.unsubscribeHouses(); //unsubscribeHouses( server, server.houses );
            //     console.log( 'after unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            //     server.removeConf(); //server.removeHouses(); //removeHouses( server.houses );
            // }

            // server.setConf( Configuration.generateList( angular.fromJson( messagePayloadString ), vm.scope ), true );
            // // console.log( 'generated ', server.conf.items.length, ' items and ',  server.conf.houses.length, ' houses' );

            // if( withoutScopeApply )
            // {
                addConf( server.conf );
            // }
            // else
            // {
            //     $scope.$apply( addConf( server.conf ) );
            //     // console.log( vm.items.length + ' items and ' + vm.houses.length + ' houses should be rendered for server ', server );
            // }
            
            // console.log( 'before subscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            // if( server.failover )
            // {
            //     console.log( 'before subscribing server.failover: ', server.failover.type, ' has ', server.failover.observerDevices.length, ' observerDevices: ', server.failover.observerDevices );
            // }
            
            // server.subscribeConf();
            
            // console.log( 'after subscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            // if( server.failover )
            // {
            //     console.log( 'after subscribing server.failover: ', server.failover.type, ' has ', server.failover.observerDevices.length, ' observerDevices: ', server.failover.observerDevices );
            // }    
        }


        function removeConf( conf )
        {            
        }
         
        function addConf( conf )
        {
            vm.container = conf.container;
        }

        vm.openSettingsDialog = function( server )
        {
            // console.log( 'in ServerController.openSettingsDialog server param: ', server );
            $uibModal.open({
                templateUrl: 'app/entities/server/server-settings-dialog.html',
                controller: 'ServerSettingsDialogController',
                controllerAs: 'vm',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    server: function() { return server; },
                    
                    translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate,$translatePartialLoader) {
                        $translatePartialLoader.addPart('server');
                        return $translate.refresh();
                    }]
                }
            }).result.then(function() {
                console.log( 'success' );
            }, function() {
                console.log( 'failure' );
            });
        }

        //ahat: This does not seem to work
        $scope.$on( 'server-settings:update', 
            function( event, server ) { 
                console.log( server );
                server.scope = $scope;
                vm.server = server;
            }
        
        );
    }
    
})();
