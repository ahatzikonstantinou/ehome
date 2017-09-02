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

        vm.items = [];
        vm.houses = [];
        
        // console.log( vm.houses );
        vm.isCollapsed = [];        

        function createCollapsedHouse( house )
        {
            var collapsedHouse = { 
                house: true,
                filter: { DOOR: true, WINDOW: true, LIGHT: true, CLIMATE: true, COVER: true, ALARM: true, CAMERA: true, MOTION: true },
                allChildrenExpanded: false,
                showMqttTopics: false,
                floor: []
            };
            for( var f  = 0 ; f < house.floors.length ; f++ )
            {
                collapsedHouse.floor[f] = { floor: true, room: [] };
                // console.log( 'House[',i,'].floors[',f,']: ', vm.houses[i].floors[f] );
                for( var r  = 0 ; r < house.floors[f].rooms.length ; r++ )
                {
                    collapsedHouse.floor[f].room[r] = { room: true };
                }
            }
            return collapsedHouse;
        }

/*
        function initCollapsedList()
        {
            for( var i = 0 ; i < vm.houses.length ; i++ )
            {            
                vm.isCollapsed[i] = createCollapsedHouse( vm.houses[i] );
            }
        }
*/
        vm.expandAllChildren = function( house, expand )
        {
            for( var houseIndex = 0 ; houseIndex < vm.houses.length ; houseIndex++ )
            {
                if( !angular.equals( vm.houses[houseIndex], house ) )
                {
                    continue;
                }
                            
                vm.isCollapsed[ houseIndex ].house = expand;
                vm.isCollapsed[ houseIndex ].allChildrenExpanded = !expand;
                for( var f = 0 ; f < vm.houses[houseIndex].floors.length ; f++ )
                {
                    vm.isCollapsed[houseIndex].floor[f].floor = expand;
                    for( var r  = 0 ; r < vm.houses[houseIndex].floors[f].rooms.length ; r++ )
                    {
                        vm.isCollapsed[houseIndex].floor[f].room[r].room = expand;
                    }
                }
            }
        }
        
        // console.log( vm.isCollapsed );

        Server.init( vm.server, updateConfiguration, removeConf, removeHouses );


        function updateConfiguration( server, messagePayloadString )
        {
            if( server.houses && server.houses.length > 0 )
            {
                console.log( 'unsubscribing and removing ', server.houses, ' houses that already existed in the server: ', server.type );
            }
            if( vm.houses && vm.houses.length > 0 )
            {
                console.log( 'unsubscribing and removing ', vm.houses, ' houses that already existed in the web app controller, (server: ', server.type, ')' );
            }

            if( ( server.houses && server.houses.length > 0 ) || ( vm.houses && vm.houses.length > 0 ) )
            {
                console.log( 'before unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
                server.unsubscribeConf(); //server.unsubscribeHouses(); //unsubscribeHouses( server, server.houses );
                console.log( 'after unsubscribing server: ', server.type, ' has ', server.observerDevices.length, ' observerDevices: ', server.observerDevices );
                server.removeConf; //server.removeHouses(); //removeHouses( server.houses );
            }

            // server.setHouses( Configuration.generateList( angular.fromJson( messagePayloadString ) ).houses );
            server.setConf( Configuration.generateList( angular.fromJson( messagePayloadString ) ) );
            console.log( 'generated ', server.conf.items.length, ' items and ',  server.conf.houses.length, ' houses' );

            $scope.$apply( addConf( server.conf ) ); //$scope.$apply( addHouses( server.conf.houses ) );
            console.log( vm.items.length + ' items and ' + vm.houses.length + ' houses should be rendered for server ', server );
            
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
            for( var i = 0 ; i < conf.items.legth ; i++ )
            {
                vm.items.splice( i, 1 );
            }

            removeHouses( conf.houses );
        }

        function removeHouses( houses )
        {
            console.log( 'removing ', houses.length, ' houses' );
            for( var rm = 0 ; rm < houses.length ; rm++ )
            {
                for( var h = 0 ; h < vm.houses.length ; h++ )
                {
                    if( vm.houses[h].name == houses[rm].name )
                    {
                        console.log( 'removing house ', houses[rm].name );
                        vm.houses.splice( h, 1 );
                        vm.isCollapsed.splice( h, 1 );
                    }
                }
            }
        }

        function addConf( conf )
        {
            var items = conf.items.sort( function( a, b ) { return a.name.localeCompare( b.name ); } );
            for( var i = 0 ; i < items.length ; i++ )
            {
                var added = false;
                for( var a = 0 ; a < vm.items ; a++ )
                {
                    if( a.name.localeCompare( vm.items[a].name ) > 0 )
                    {
                        vm.items.splice( a, 0, items[i] );
                        added = true;
                        break;
                    }
                }
                if( !added )
                {
                    vm.items.push( items[i] );
                }
                console.log( 'added item ', items[i] );
            }
            addHouses( conf.houses );
        }

        function addHouses( houses )
        {
            console.log( 'adding ', houses.length, ' houses' );
            var add = houses.sort( function( a, b ) { return a.name.localeCompare( b.name ); } );
            for( var a = 0 ; a < add.length ; a++ )
            {
                var added = false;
                for( var h = 0 ; h < vm.houses ; h++ )
                {
                    if( a.name.localeCompare( vm.houses[h].name ) > 0 )
                    {
                        vm.houses.splice( h, 0, add[a] );
                        vm.isCollapsed.splice( h, 0, createCollapsedHouse( add[a] ) );
                        added = true;
                        break;
                    }
                }
                if( !added )
                {
                    vm.houses.push( add[a] );
                    vm.isCollapsed.push( createCollapsedHouse( add[a] ) );
                }
                console.log( 'added house ', add[a] );

            }
        }

    }
})();
