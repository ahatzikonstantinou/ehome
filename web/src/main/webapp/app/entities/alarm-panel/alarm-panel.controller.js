(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('AlarmPanelController', AlarmPanelController);

    AlarmPanelController.$inject = ['$scope', '$state', 'MqttClient', 'Door1', 'Window1R', 'Light1', 'TemperatureHumidity', 'Door2R', 'Net', 'Roller1_Auto', 'Window2R', 'Roller1', 'Light2', 'Alarm', 'IPCamera', 'IPCameraPanTilt', 'Houses', 'topic', '$window' ];

    function AlarmPanelController($scope, $state, MqttClient, Door1, Window1R, Light1, TemperatureHumidity, Door2R, Net, Roller1_Auto, Window2R, Roller1, Light2, Alarm, IPCamera, IPCameraPanTilt, Houses, topic, $window ) {
        var vm = this;

        $window.document.activeElement.blur();

        vm.topic = topic;
        vm.subscribe = topic + 'status';
        vm.publish = topic + 'set';
        vm.alarm = new Alarm( vm.subscribe, vm.publish, { main: 'UNKNOWN', countdown: -1 } )
        vm.pin = '';

        console.log( 'topic: ', topic);

        //MQTT
        var mqtt_broker_ip = '192.168.1.11';
        var mqtt_broker_port = '1884';
        var mqtt_client_id = 'eHomeWebGUIAlarmPanel'
        var client = MqttClient;
        client.init( mqtt_broker_ip, mqtt_broker_port, mqtt_client_id );
        
        function successCallback()
        {
            console.log( 'subscribe: ', vm.subscribe );
            client.subscribe( vm.alarm.mqtt_subscribe_topic );
            vm.alarm.setPublisher( client );
        }

        client._client.onMessageArrived = function( message )
        {
            console.log( 'Received [topic] "message": [', message.destinationName.trim(), '] "', message.payloadString, '"' );
            $scope.$apply( function() {
                vm.alarm.update( message.destinationName, message.payloadString );

                // clear the pin whenever there is no challenge pin to match
                if( 0 == vm.alarm.state.challengePin.length )
                {
                    vm.pin = '';
                }
            });
        }

        client._client.onConnectionLost = function( errorCode ) { 
            console.log( 'Connection lost with erro code: ', errorCode, ' attempting to reconnect.' );
            client.connect( {
                onSuccess: successCallback,
                onFailure: function() { alert( 'Failed to connect to mqtt broker ', mqtt_broker_ip, mqtt_broker_port ); }
            } );
        }

        client.connect( {
            onSuccess: successCallback,
            onFailure: function() { alert( 'Failed to connect to mqtt broker ', mqtt_broker_ip, mqtt_broker_port ); }
        } );   

        vm.pinAdd = function( digit )
        {   
            if( vm.pin.length < 4 )         
            {
                vm.pin += digit;
            }
            else
            {
                vm.pin = vm.pin.substring( 0, vm.pin.length - 1 ) + digit;
            }

            if( 4 == vm.pin.length )
            {
                vm.alarm.deactivate( vm.pin );
            }
        }

        vm.pinDelChar = function()
        {
            vm.pin = vm.pin.substring( 0, vm.pin.length - 1 );
        }
    }
})();
