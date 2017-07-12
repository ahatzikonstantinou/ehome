(function() {
    'use strict';

    angular
        .module('eHomeApp')
        .controller('NavbarController', NavbarController);

    NavbarController.$inject = ['$state'];
    //, 'ProfileService', 'Auth', 'Principal', 'LoginService'];

    function NavbarController ($state){ 
        //, ProfileService, Auth, Principal, LoginService) {
        var vm = this;

        vm.isNavbarCollapsed = true;
        vm.isAuthenticated = function(){return true;}; //Principal.isAuthenticated;

        vm.inProduction = true;
        vm.swaggerEnabled = false;
        // ProfileService.getProfileInfo().then(function(response) {
        //     vm.inProduction = response.inProduction;
        //     vm.swaggerEnabled = response.swaggerEnabled;
        // });

        // vm.login = login;
        // vm.logout = logout;
        vm.toggleNavbar = toggleNavbar;
        vm.collapseNavbar = collapseNavbar;
        vm.$state = $state;

        // function login() {
        //     collapseNavbar();
        //     LoginService.open();
        // }

        // function logout() {
        //     collapseNavbar();
        //     Auth.logout();
        //     $state.go('home');
        // }

        function toggleNavbar() {
            vm.isNavbarCollapsed = !vm.isNavbarCollapsed;
        }

        function collapseNavbar() {
            vm.isNavbarCollapsed = true;
        }
    }
})();
