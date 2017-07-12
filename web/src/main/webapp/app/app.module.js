(function() {
    'use strict';

    angular
        .module('eHomeApp', [
            'ngStorage',
            'tmh.dynamicLocale',
            'pascalprecht.translate',
            'ngResource',
            'ngCookies',
            'ngAria',
            'ngCacheBuster',
            'ngFileUpload',
            'ui.bootstrap',
            'ui.bootstrap.datetimepicker',
            'ui.router',
            'infinite-scroll',
            // jhipster-needle-angularjs-add-module JHipster will add new module here
            'angular-loading-bar',
            'ui.toggle',
            'rzModule',
            'angularPaho'
        ])
        .config(['$compileProvider', '$sceDelegateProvider', function ($compileProvider, $sceDelegateProvider) {
            console.log( 'will whitelist urls' );
            
            //the following two lines are necessary if the camera urls used in houses are from another domain/host
            $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
            // $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/); // this is for urls

            //the following line is and overkill, it whitelists everything in case the previous two lines don't work
            // $sceDelegateProvider.resourceUrlWhitelist(['**']);
            console.log( 'finished whitelisting urls' );
        }])
        .run(run);


    run.$inject = ['stateHandler', 'translationHandler'];

    function run(stateHandler, translationHandler) {
        stateHandler.initialize();
        translationHandler.initialize();
    }
})();
