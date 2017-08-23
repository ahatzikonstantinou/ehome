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
            Device.call( this );
            //public properties
            this.url = url;
        }

        IPCamera.prototype = Object.create( Device.prototype );
        IPCamera.prototype.constructor = IPCamera;

        return IPCamera;
    }
})();
