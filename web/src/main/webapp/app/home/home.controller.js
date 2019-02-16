(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('HomeController', HomeController);

    // HomeController.$inject = ['$scope', 'Principal', 'LoginService', '$state'];
    HomeController.$inject = [ '$http', '$scope', '$state', 'MqttClient', 'Door1', 'Window1R', 'Light1', 'TemperatureHumidity', 'Door2R', 'Net', 'Roller1_Auto', 'Window2R', 'Roller1', 'Light2', 'Alarm', 'IPCamera', 'IPCameraPanTilt', 'MotionCamera', 'MotionCameraPanTilt', 'Configuration' ];

    // function HomeController ($scope, Principal, LoginService, $state) {
    function HomeController( $http, $scope, $state, MqttClient, Door1, Window1R, Light1, TemperatureHumidity, Door2R, Net, Roller1_Auto, Window2R, Roller1, Light2, Alarm, IPCamera, IPCameraPanTilt, MotionCamera, MotionCameraPanTilt, Configuration ) {
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
            return [
                {
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
                            subscribeTopic: 'Configurator/status', //'A///CONFIGURATION/C/status',
                            publishTopic: 'Configurator/set', //'A///CONFIGURATION/C/cmd',
                            publishMessage: '{"cmd": "SEND"}'
                        },
                        connection: {
                            subscribeTopic: 'connection',
                            publishTopic: 'connection/report',
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

        

    }
})();
