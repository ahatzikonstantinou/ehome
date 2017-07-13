(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .factory('MotionCameraPanTilt', MotionCameraPanTilt);

    MotionCameraPanTilt.$inject = [ '$http', 'MotionCamera' ];

    function MotionCameraPanTilt( $http, MotionCamera ) {
        //Constructor
        function MotionCameraPanTilt( mqtt_subscribe_topic, mqtt_publish_topic, cameraId, videostream, state, detection )
        {
            MotionCamera.call( this, mqtt_subscribe_topic, mqtt_publish_topic, cameraId, videostream, state, detection );
        }

        MotionCameraPanTilt.prototype = Object.create( MotionCamera.prototype );
        MotionCameraPanTilt.prototype.constructor = MotionCameraPanTilt;

        MotionCameraPanTilt.prototype.up = function(){ this._cmd( 'up' ); }
        MotionCameraPanTilt.prototype.down = function(){ this._cmd( 'down' ); }
        MotionCameraPanTilt.prototype.left = function(){ this._cmd( 'left' ); }
        MotionCameraPanTilt.prototype.right = function(){ this._cmd( 'right' ); }
        MotionCameraPanTilt.prototype.stop = function(){ this._cmd( 'stop' ); }

        return MotionCameraPanTilt;
    }
})();

