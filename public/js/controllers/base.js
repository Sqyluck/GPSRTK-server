/*
Base Controller
 */

angular.module('gpsrtk-app')
  .controller('baseCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $scope.allBases = []
    $scope.baseMap = null
    $scope.baseMarker = null
    $scope.baseChosen = null
    $rootScope.choose(1)

    var timer = () => {
      if ($scope.baseChosen) {
        $scope.actualize()
      }
      setTimeout(timer, 5000)
    }
    setTimeout(timer, 5000)

    $scope.timeToString = (time) => {
      let date = new Date(time)
      return date.toLocaleDateString('fr-FR') + ' ' +
       date.getHours().toString().padStart(2, '0') + ':' +
       date.getMinutes().toString().padStart(2, '0') + ':' +
       date.getSeconds().toString().padStart(2, '0')
    }

    $scope.getAllBases = () => {
      return new Promise((resolve, reject) => {
        $http({
          method: 'GET',
          url: $rootScope.ipAddress + '/allBases'
        }).then((data) => {
          $scope.allBases = data.data
          resolve()
        })
      })
    }

    $scope.getAllBases()

    $scope.loadBase = (base) => {
      $scope.baseChosen = base
      $scope.baseChosen.trueAltitude = $scope.baseChosen.trueAltitude ? Number($scope.baseChosen.trueAltitude) : 0
      initMap($scope.baseChosen.latitude, $scope.baseChosen.longitude)
      setMarker($scope.baseChosen.latitude, $scope.baseChosen.longitude)
    }

    $scope.modifyBase = () => {
      if (typeof $scope.newAcc === 'number') {
        console.log('change acc')
        if ($scope.baseChosen.connected) {
          $http({
            method: 'GET',
            url: $scope.ipAddress + '/changeAcc/' + $scope.baseChosen._id + '/' + (Math.round($scope.newAcc * 10000))
          })
        } else {
          window.alert('Impossible, cette base n\'est pas connectée')
        }
      }
      if (typeof $scope.newAltitude === 'number') {
        console.log('change altitude')
        $http({
          method: 'GET',
          url: $scope.ipAddress + '/setAltitude/' + $scope.baseChosen._id + '/' + $scope.newAltitude
        })
      }
      $scope.actualize()
      $scope.newAcc = null
      $scope.newAltitude = null
    }

    $scope.backToList = () => {
      $scope.baseChosen = null
    }

    $scope.actualize = () => {
      $scope.getAllBases().then(() => {
        $scope.allBases.forEach((base) => {
          if ($scope.baseChosen) {
            if (base._id === $scope.baseChosen._id) {
              $scope.baseChosen = base
              setMarker(base.latitude, base.longitude)
              $scope.$apply()
            }
          }
        })
      })
    }

    var initMap = (lat, lng) => {
      console.log('initMap')
      $scope.baseMap = new google.maps.Map(document.getElementById('baseMap'), {
        center: new google.maps.LatLng(lat, lng),
        zoom: 17,
        maxZoom: 30,
        mapTypeId: 'satellite',
        tilt: 0,
        heading: 360,
        draggableCursor: 'crosshair',
        gestureHandling: 'greedy'
      })
    }

    var setMarker = (lat, lng) => {
      if ($scope.baseMarker) {
        $scope.baseMarker.setMap(null)
      }
      $scope.baseMarker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: $scope.baseMap,
        icon: baseIcon,
        clickable: true
      })
    }
  }])

var baseIcon = {
  url: 'base.png',
  anchor: new google.maps.Point(18 / 2, 18 / 2),
  scaledSize: new google.maps.Size(18, 18)
}
