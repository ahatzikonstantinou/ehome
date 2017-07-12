(function() {
    'use strict';
    angular
        .module('eHomeApp')
        .factory('MqttItem', MqttItem);

    MqttItem.$inject = ['$resource'];

    function MqttItem ($resource) {
        var resourceUrl =  'api/mqtt-items/:id';

        return $resource(resourceUrl, {}, {
            'query': { method: 'GET', isArray: true},
            'get': {
                method: 'GET',
                transformResponse: function (data) {
                    if (data) {
                        data = angular.fromJson(data);
                    }
                    return data;
                }
            },
            'update': { method:'PUT' }
        });
    }
})();
