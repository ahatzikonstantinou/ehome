(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerController', ServerController);

    // ServerController.$inject = ['$scope', 'Principal', 'LoginService', '$state'];
    ServerController.$inject = [ '$scope', 'Configuration', 'Server' ];

    // function ServerController ($scope, Principal, LoginService, $state) {
    function ServerController( $scope, Configuration, Server ) {
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

        var theServer = Server.init( vm.server, updateConfiguration, removeConf );

        // attempt to initialise with last saved configuration
        var configuration = localStorage.getItem( 'configuration' );
        if( configuration )
        {
            configuration = JSON.parse( configuration );
            console.log( "attempting to initialize with last saved configuration: ", configuration );
            updateConfiguration( vm.server, configuration, true );
        }

        function updateConfiguration( server, messagePayloadString, withoutScopeApply )
        {
            // if( server.houses && server.houses.length > 0 )
            // {
            //     console.log( 'unsubscribing and removing ', server.houses, ' houses that already existed in the server: ', server.type );
            // }
            // if( vm.houses && vm.houses.length > 0 )
            // {
            //     console.log( 'unsubscribing and removing ', vm.houses, ' houses that already existed in the web app controller, (server: ', server.type, ')' );
            // }

            if( ( server.houses && server.houses.length > 0 ) || ( vm.houses && vm.houses.length > 0 ) )
            {
                console.log( 'before unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
                server.unsubscribeConf(); //server.unsubscribeHouses(); //unsubscribeHouses( server, server.houses );
                console.log( 'after unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
                server.removeConf(); //server.removeHouses(); //removeHouses( server.houses );
            }

            // server.setHouses( Configuration.generateList( angular.fromJson( messagePayloadString ) ).houses );
            server.setConf( Configuration.generateList( angular.fromJson( messagePayloadString ), vm.scope ), true );
            // console.log( 'generated ', server.conf.items.length, ' items and ',  server.conf.houses.length, ' houses' );

            if( withoutScopeApply )
            {
                addConf( server.conf );
            }
            else
            {
                $scope.$apply( addConf( server.conf ) ); //$scope.$apply( addHouses( server.conf.houses ) );
                // console.log( vm.items.length + ' items and ' + vm.houses.length + ' houses should be rendered for server ', server );
            }
            
            console.log( 'before subscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            if( server.failover )
            {
                console.log( 'before subscribing server.failover: ', server.failover.type, ' has ', server.failover.observerDevices.length, ' observerDevices: ', server.failover.observerDevices );
            }
            // subscribeHouses( server, server.houses );
            server.subscribeConf(); //server.subscribeHouses( server.houses );
            
            console.log( 'after subscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
            if( server.failover )
            {
                console.log( 'after subscribing server.failover: ', server.failover.type, ' has ', server.failover.observerDevices.length, ' observerDevices: ', server.failover.observerDevices );
            }    
        }


        function removeConf( conf )
        {            
        }
         
        function addConf( conf )
        {
            vm.container = conf.container;
        }
    }
})();
