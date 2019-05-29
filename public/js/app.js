'use strict'

/**
 * Déclaration de l'application routeApp
 */
var app = angular.module('gpsrtk-app', [
  'ngRoute',
  'routeAppControllers'
])

var routeAppControllers = angular.module('routeAppControllers', [])

routeAppControllers
  .controller('mainCtrl', ['$scope', '$location', '$rootScope', ($scope, $location, $rootScope) => {
    $rootScope.ipAddress = 'http://rtk.noolitic.com:3000'
    $rootScope.map = null
    $rootScope.roverMarkers = []

    $scope.baseChoice = false
    $scope.recordChoice = false
    $scope.roverChoice = false

    $rootScope.choose = (choice) => {
      if (choice === 0) {
        if (!$scope.recordChoice) {
          $scope.recordChoice = true
          $scope.baseChoice = false
          $scope.roverChoice = false
          $location.path('/record')
        }
      } else if (choice === 1) {
        if (!$scope.baseChoice) {
          $scope.recordChoice = false
          $scope.baseChoice = true
          $scope.roverChoice = false
          $location.path('/base')
        }
      } else if (choice === 2) {
        if (!$scope.roverChoice) {
          $scope.recordChoice = false
          $scope.baseChoice = false
          $scope.roverChoice = true
          $location.path('/rover')
        }
      }
    }
  }])


app.config(['$routeProvider',
  ($routeProvider) => {
    $routeProvider
      .when('/home', {
        templateUrl: 'partials/home.html',
        controller: 'homeCtrl'
      })
      .when('/base', {
        templateUrl: 'partials/base.html',
        controller: 'baseCtrl'
      })
      .when('/record', {
        templateUrl: 'partials/record.html',
        controller: 'recordCtrl'
      })
      .when('/rover', {
        templateUrl: 'partials/rover.html',
        controller: 'roverCtrl'
      })
      .otherwise({
        redirectTo: '/record'
      })
  }
])
