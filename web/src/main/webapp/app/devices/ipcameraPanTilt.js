(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('IPCameraPanTilt', IPCameraPanTilt);

    IPCameraPanTilt.$inject = [];

    function IPCameraPanTilt() {
        //Constructor
        function IPCameraPanTilt( baseUrl, videostream, right, left, up, down, stop )
        {
            //public properties
            this.baseUrl = baseUrl; 
            this.videostream = videostream; 
            this.right = right; 
            this.left = left; 
            this.up = up; 
            this.down = down; 
            this.stop = stop;        
        }

        function videoUrl() { return baseUrl + videostream ; }
        function rightUrl() { return baseUrl + right ; }
        function leftUrl() { return baseUrl + left ; }
        function upUrl() { return baseUrl + up ; }
        function downUrl() { return baseUrl + down ; }
        function stopUrl() { return baseUrl + stop ; }

        return IPCameraPanTilt;
    }
})();
