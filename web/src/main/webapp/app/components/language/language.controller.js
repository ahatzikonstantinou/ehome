(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('JhiLanguageController', JhiLanguageController);

    JhiLanguageController.$inject = ['$translate', 'JhiLanguageService', 'tmhDynamicLocale'];

    function JhiLanguageController ($translate, JhiLanguageService, tmhDynamicLocale) {
        var vm = this;

        vm.changeLanguage = changeLanguage;

        vm.languages = null;

        JhiLanguageService.getAll().then(function (languages) {
            vm.languages = languages;
            // console.log( 'languages: ', languages ); //ahat
        });

        function changeLanguage (languageKey) {
            // console.log( 'changeLanguage to : ', languageKey ); //ahat
            $translate.use(languageKey);
            tmhDynamicLocale.set(languageKey);
            localStorage.setItem('languageKey', languageKey);   //ahat
        }

        //ahat
        var languageKey = localStorage.getItem( 'languageKey' );
        // console.log( 'read languageKey "', languageKey, '" from localStorage' );
        if( languageKey )
        {
            // console.log( 'will use "', languageKey, '" for translation' );
            $translate.use( languageKey );
            tmhDynamicLocale.set( languageKey );            
        }
        // else
        // {
        //     console.log( 'no languageKey was found in localStorage' );
        // }

    }
})();
