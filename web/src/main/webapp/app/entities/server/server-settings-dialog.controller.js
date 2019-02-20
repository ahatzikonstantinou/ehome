(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('ServerSettingsDialogController', ServerSettingsDialogController);

        ServerSettingsDialogController.$inject = ['$timeout', '$scope', '$rootScope', '$stateParams', '$uibModalInstance', '$uibModal', 'server' ];

    function ServerSettingsDialogController ($timeout, $scope, $rootScope, $stateParams, $uibModalInstance, $uibModal, server ) {
        var vm = this;

        vm.originalServer = server;
        // the following object copies server properties for 2 reasons, 1) to make them available to the html form, 2: to carry them over
        // after editing/creating a server
        // id, name, type are displayed and carried over.
        // mqtt and xmpp are only for html use. After creating/editing and depending on the "type" value, the corresponding settings
        // will be copied to the server's "settings" property
        // "settings" will not be displayed in html, it is used by the code and filled in afte html form has submitted
        // "connection" is used to store current connection information and is not displayed. It will be filled in by the server code
        // while the server is running.
        // "failover" can only be an xmpp server and only if the type of the (primary) server is mqtt.
        vm.server = {
            id: server.id,
            name: server.name,
            type: server.type,
            mqtt: { 
                broker_ip: server.type == "mqtt" ? server.settings.mqtt_broker_ip : null, 
                broker_port: server.type == "mqtt" ? server.settings.mqtt_broker_port : null, 
                client_id: server.type == "mqtt" ? server.settings.mqtt_client_id : null 
            },
            xmpp: { 
                host: server.type == "xmpp" ? server.settings.host : null,
                user: server.type == "xmpp" ? server.settings.user : null,
                password: server.type == "xmpp" ? server.settings.password: null,
                destination: server.type == "xmpp" ? server.settings.destination : null,
                email: server.type == "xmpp" ? server.settings.email : null
            },
            mqtt_connection: server.settings.connection,
            mqtt_configuration: server.settings.configuration,
            // settings: server.settings,
            // connection: server.connection,
            useFailover: server.useFailover ? server.useFailover : false,
            failover: { 
                active: false, 
                type: 'xmpp', 
                host: server.failover ? server.failover.settings.host : null, 
                user: server.failover ? server.failover.settings.user : null, 
                password: server.failover ? server.failover.settings.password : null, 
                destination: server.failover ? server.failover.settings.destination : null, 
                email: server.failover ? server.failover.settings.email : null 
            }
        };

        console.log( 'vm.server:', vm.server );
        
        vm.clear = clear;
        vm.save = save;
        vm.deleteServer = deleteServer;

        $timeout(function (){
            angular.element('.form-group:eq(1)>input').focus();
        });

        function clear () {
            $uibModalInstance.dismiss('cancel');
        }

        function save () {
            vm.isSaving = true;
            var server = {};
            try
            {
                if( !vm.server.id )
                {
                    vm.server.id = uuidv4();
                }
                server.id = vm.server.id;
                server.name = vm.server.name;
                server.type = vm.server.type;
                if( vm.originalServer.connection )
                {
                    server.connection = vm.originalServer.connection;
                }
                else
                {
                    server.connection = { 
                        type: 'NOT_CONNECTED', // 'ADSL', // '3G', //NOT_CONNECTED',
                        primary: true,
                        protocol: 'UNAVAILABLE' //'Mqtt' // 'UNAVAILABLE'
                    };
                }                
                server.conf = vm.originalServer.conf ? vm.originalServer.conf : { container: {} };
                

                if( vm.server.type == 'mqtt' )
                {                    
                    server.settings = {
                        mqtt_broker_ip: vm.server.mqtt.broker_ip,
                        mqtt_broker_port: vm.server.mqtt.broker_port,
                        mqtt_client_id: vm.server.mqtt.client_id,
                        configuration: {
                            subscribeTopic: vm.server.mqtt_configuration.subscribeTopic,
                            publishTopic: vm.server.mqtt_configuration.publishTopic,
                            publishMessage: vm.server.mqtt_configuration.publishMessage
                        },
                        connection: {
                            publishTopic: vm.server.mqtt_connection.publishTopic,
                            subscribeTopic: vm.server.mqtt_connection.subscribeTopic,
                            keepAliveInterval: parseInt( vm.server.mqtt_connection.keepAliveInterval ),
                            timeout: parseInt( vm.server.mqtt_connection.timeout )
                        }
                    };
                    server.useFailover = vm.server.useFailover;
                    server.failover = {
                        active: false,
                        type: 'xmpp',
                        settings: {
                            host: vm.server.failover.host,
                            user: vm.server.failover.user,
                            password: vm.server.failover.password,
                            destination: vm.server.failover.destination,
                            email: vm.server.failover.email,
                            configuration: {
                                subscribeTopic: vm.server.mqtt_configuration.subscribeTopic,
                                publishTopic: vm.server.mqtt_configuration.publishTopic,
                                publishMessage: vm.server.mqtt_configuration.publishMessage
                            },
                            connection: {
                                publishTopic: vm.server.mqtt_connection.publishTopic,
                                subscribeTopic: vm.server.mqtt_connection.subscribeTopic
                            }
                        },
                        connection: {
                            type: 'NOT_CONNECTED',
                            primary: false,
                            protocol: 'Xmpp'
                        },    
                        conf: { container: {} }
                    };
                }
                else
                {
                    server.settings = {
                        host: vm.server.xmpp.host,
                        user: vm.server.xmpp.user,
                        password: vm.server.xmpp.password,
                        destination: vm.server.xmpp.destination,
                        email: vm.server.xmpp.email,
                        configuration: {
                            subscribeTopic: vm.server.mqtt_configuration.subscribeTopic,
                            publishTopic: vm.server.mqtt_configuration.publishTopic,
                            publishMessage: vm.server.mqtt_configuration.publishMessage
                        },
                        connection: {
                            publishTopic: vm.server.mqtt_connection.publishTopic,
                            subscribeTopic: vm.server.mqtt_connection.subscribeTopic
                        }                        
                    };
                }

                localStorage.setItem( 'server_' + server.id, angular.toJson( server ) );
                onSaveSuccess( server );
            }
            catch( error )
            {
                onSaveError();
            }
        }

        function onSaveSuccess (result) {
            $uibModalInstance.close(result);
            vm.isSaving = false;
            $rootScope.$emit('server-settings:update', result);
        }

        function onSaveError () {
            vm.isSaving = false;
        }

        function deleteServer ()
        {
            $uibModal.open({
                templateUrl: 'app/entities/server/server-delete-dialog.html',
                controller: 'ServerDeleteController',
                controllerAs: 'vm',
                size: 'md',
                resolve: {
                    server: function() {
                        return vm.server;
                    }
                }
            }).result.then(function() {
                onDelete();
            });
        }

        function onDelete()
        {
            console.log( 'Deleting...' );
            vm.isSaving = true;
            try
            {
                if( !vm.server.id )
                {
                    console.error( 'Cannot delete a server that has no id' );
                }
                var deletedId = vm.server.id;
                localStorage.removeItem( 'server_' + vm.server.id );
                onDeleteSuccess( deletedId );
            }
            catch( error )
            {
                onSaveError();
            }
        }

        function onDeleteSuccess( deletedId )
        {
            $uibModalInstance.close( deletedId );
            vm.isSaving = false;
            $rootScope.$emit('server-settings:deleted', deletedId);
        }

    }
})();
