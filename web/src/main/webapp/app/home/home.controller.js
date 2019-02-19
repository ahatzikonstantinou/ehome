(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('HomeController', HomeController);

    // HomeController.$inject = ['$scope', 'Principal', 'LoginService', '$state'];
    HomeController.$inject = [ '$http', '$scope', '$rootScope', '$state', 'MqttClient', 'Door1', 'Window1R', 'Light1', 'TemperatureHumidity', 'Door2R', 'Net', 'Roller1_Auto', 'Window2R', 'Roller1', 'Light2', 'Alarm', 'IPCamera', 'IPCameraPanTilt', 'MotionCamera', 'MotionCameraPanTilt', 'Configuration', '$uibModal' ];

    // function HomeController ($scope, Principal, LoginService, $state) {
    function HomeController( $http, $scope, $rootScope, $state, MqttClient, Door1, Window1R, Light1, TemperatureHumidity, Door2R, Net, Roller1_Auto, Window2R, Roller1, Light2, Alarm, IPCamera, IPCameraPanTilt, MotionCamera, MotionCameraPanTilt, Configuration, $uibModal ) {
        var vm = this;

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

        
        function uuidv4() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11)
                .replace(
                    /[018]/g, 
                    function( c ){
                        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                    }
                );
        }

        function getAllServers()
        {
            var servers = [];
            for ( var i = 0, len = localStorage.length; i < len; ++i ) 
            {
                // console.log( localStorage.getItem( localStorage.key( i ) ) );
                var key = localStorage.key( i );
                if( !key.startsWith( 'server_' ) )
                {
                    continue;
                }
                var data = angular.fromJson( localStorage.getItem( key ) );
                
                servers.push({
                    id: data.id,
                    name: data.name,
                    type: data.type,
                    settings: data.settings,
                    connection: {
                        type: 'ADSL', // '3G', //NOT_CONNECTED',
                        primary: true,
                        protocol: 'Mqtt' // 'UNAVAILABLE'
                    },
                    failover: null,
                    conf: { container: {} }
                });
            }

            return servers;

            return [
                {
                    id: uuidv4(),
                    name: 'Antonis Athens',
                    type: 'mqtt',
                    settings: { 
                        mqtt_broker_ip : '192.168.1.31', // '192.168.1.79',
                        mqtt_broker_port : 1884,
                        //uuid is necessary because if two clients connect to the same mqtt broker with the same
                        // client id, the second client will disconnect the first, such a case is when multiple users 
                        // connect simultaneously to the mqtt broker using this web app
                        mqtt_client_id : uuidv4(), 
                        configuration: {
                            //subscribeTopic is the topic to subscribe to, in order to get configuration updates
                            subscribeTopic: 'Configurator/status', //'A///CONFIGURATION/C/status',
                            //publishTopic is the topic to subscribe to in order to ask for configuration updates to be sent
                            publishTopic: 'Configurator/set', //'A///CONFIGURATION/C/cmd',
                            publishMessage: '{"cmd": "SEND"}'
                        },
                        connection: {
                            //publishTopic is the topic to subscribe to in order to ask for connection  updates to be sent
                            publishTopic: 'connection/report',
                            //subscribeTopic is the topic to subscribe to, in order to get connection updates
                            subscribeTopic: 'connection',
                            keepAliveInterval: 5, //seconds,
                            timeout: 10 //seconds
                        }
                    },
                    connection: {
                        type: 'ADSL', // '3G', //NOT_CONNECTED',
                        primary: true,
                        protocol: 'Mqtt' // 'UNAVAILABLE'
                    },
                    failover: null, //{
                    //     active: false,
                    //     type: 'xmpp',
                    //     settings: {
                    //         host: 'wss://192.168.1.79:5281/xmpp-websocket',
                    //         user: 'antonis@ahatzikonstantinou.dtdns.net',
                    //         password: '312ggp12',
                    //         destination: 'alyki@ahatzikonstantinou.dtdns.net',
                    //         email: 'ahatziko.alyki@gmail.com',
                    //         configuration: {
                    //             subscribeTopic: 'A///CONFIGURATION/C/status',
                    //             publishTopic: 'A///CONFIGURATION/C/cmd',
                    //             publishMessage: '{"cmd": "SEND"}'
                    //         },
                    //         connection: {
                    //             subscribeTopic: 'connection',
                    //             publishTopic: 'connection/report'    
                    //         }
                    //     },
                    //     connection: {
                    //         type: 'NOT_CONNECTED',
                    //         primary: false,
                    //         protocol: 'Xmpp'
                    //     },    
                    //     conf: { items:[], houses:[] }
                    // },
                    conf: { container: {} }
                },
                // {
                //     id: uuidv4(),
                //     name: 'Antonis Alyki',
                //     type: 'xmpp',
                //     settings: {
                //         // host: 'https://jabber.hot-chilli.net:5281/http-bind',
                //         // user: 'ahatziko.web@jabber.hot-chilli.net',
                //         // password: '312ggp12',
                //         // destination: 'ahatziko.alyki@jabber.hot-chilli.net',
                //         host: 'wss://192.168.1.79:5281/xmpp-websocket',
                //         user: 'antonis@ahatzikonstantinou.dtdns.net',
                //         password: '312ggp12',
                //         destination: 'alyki@ahatzikonstantinou.dtdns.net',
                //         // ahat: Note. The following connection to accounts at jabber.hot-chilli.net return 404
                //         // host: 'wss://jabber.hot-chilli.net:5281/xmpp-websocket',
                //         // user: 'ahatziko.web@jabber.hot-chilli.net',
                //         // password: '312ggp12',
                //         // destination: 'ahatziko.alyki@jabber.hot-chilli.net',
                //         email: 'ahatziko.alyki@gmail.com',
                //         configuration: {
                //             subscribeTopic: 'A///CONFIGURATION/C/status',
                //             publishTopic: 'A///CONFIGURATION/C/cmd',
                //             publishMessage: '{"cmd": "SEND"}'
                //         },
                //         connection: {
                //             subscribeTopic: 'connection',
                //             publishTopic: 'connection/report',
                //             keepAliveInterval: 5 //seconds
                //         }
                //     },
                //     connection: {
                //         type: 'ADSL', // '3G', //NOT_CONNECTED',
                //         primary: true,
                //         protocol: 'Mqtt' // 'UNAVAILABLE'
                //     },
                //     conf: { items:[], houses:[] }
                // }
            ];
        }
        var servers = getAllServers();
        for( var i = 0 ; i < servers.length ; i++ )
        {
            servers[i].scope = $scope;
        }
        vm.servers = servers;
        console.log( 'servers: ', vm.servers );
        
        // XMPP.Client.prototype.subscribe = function( topic )
        // {
        //     console.log( 'xmpp.subscribe override, topic: ', topic );
        // }

        // XMPP.Client.prototype.publish = function( topic )
        // {
        //     console.log( 'xmpp.publish override, topic: ', topic );
        // }

        $rootScope.$on( 'server-settings:update', 
            function( event, server ) { 
                console.log( server );
                server.scope = $scope;
                for( var i = 0 ; i < vm.servers.length ; i++ )
                {
                    if( vm.servers[i].id == server.id )
                    {
                        console.log( 'Found and updated server ', vm.servers[i] );
                        vm.servers[i] = server;
                        return;
                    }
                }

                console.log( 'Did not find server ', server, ', adding to the list of servers' );                
                vm.servers.push( server );
            }
        
        );

        $rootScope.$on( 'server-settings:deleted', 
            function( event, deletedId ) { 
                console.log( "Deleted server id:", deletedId );
                for( var i = 0 ; i < vm.servers.length ; i++ )
                {
                    if( vm.servers[i].id == deletedId )
                    {
                        console.log( 'Found and removed server ', vm.servers[i] );
                        vm.servers[i].configurationDevice.deleteFromLocalStorage();
                        vm.servers.splice( i, 1 );
                        return;
                    }
                }

                console.log( 'Did not find server to delete' );
            }
        
        );


        vm.openSettingsDialog = function()
        {
            // console.log( 'in ServerController.openSettingsDialog server param: ', server );
            $uibModal.open({
                templateUrl: 'app/entities/server/server-settings-dialog.html',
                controller: 'ServerSettingsDialogController',
                controllerAs: 'vm',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    server: function() { 
                        return {
                            id: null,
                            name: "",
                            type: "mqtt",
                            settings: { 
                                mqtt_broker_ip : '',
                                mqtt_broker_port : 1884,
                                mqtt_client_id : uuidv4(), 
                                configuration: {
                                    subscribeTopic: 'Configurator/status',
                                    publishTopic: 'Configurator/set',
                                    publishMessage: '{"cmd": "SEND"}'
                                },
                                connection: {
                                    publishTopic: 'connection/report',
                                    subscribeTopic: 'connection',
                                    keepAliveInterval: 5, //seconds,
                                    timeout: 10 //seconds
                                }
                            },
                            connection: {
                                type: 'ADSL', // '3G', //NOT_CONNECTED',
                                primary: true,
                                protocol: 'Mqtt' // 'UNAVAILABLE'
                            },
                            failover: null
                        };
                    },
                    
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

    }
})();
