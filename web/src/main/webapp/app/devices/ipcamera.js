(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('IPCamera', IPCamera);

    IPCamera.$inject = [];

    function IPCamera() {
        //Constructor
        function IPCamera( url )
        {
            //public properties
            this.url = url;
        }

        return IPCamera;
    }
})();
