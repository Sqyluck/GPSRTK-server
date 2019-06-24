/*
Base Controller
 */

var baseMap = null

angular.module('gpsrtk-app')
  .controller('baseCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $scope.allBases = []
    $scope.baseMarker = null
    $scope.baseChosen = null
    $rootScope.choose(1)

    var timer = setInterval(() => {
      $scope.actualize()
    }, 5000)

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
          $scope.allBases.forEach((base, index) => {
            $scope.allBases[index].connected = ((base.lastUpdate > Date.now() - 120000) && base.connected)
          })
          resolve()
        })
      })
    }

    $scope.getAllBases()

    $scope.loadBase = (base) => {
      $scope.baseChosen = base
      $scope.baseChosen.trueAltitude = $scope.baseChosen.trueAltitude ? Number($scope.baseChosen.trueAltitude) : 0
      initBaseMap($scope.baseChosen.latitude, $scope.baseChosen.longitude)
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

    var initBaseMap = (lat, lng) => {
      baseMap = new google.maps.Map(document.getElementById('baseMap'), {
        center: new google.maps.LatLng(lat, lng),
        zoom: 20,
        maxZoom: 30,
        mapTypeId: 'satellite',
        tilt: 0,
        heading: 360,
        draggableCursor: 'crosshair',
        gestureHandling: 'greedy'
      })
      /*
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          baseMap = L.map('baseMap').setView([lat, lng], 18)
          L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            minZoom: 1,
            maxZoom: 20
          }).addTo(baseMap)
          setTimeout(() => {
            resolve()
          }, 1000)
        }, 1000)
      }) */
    }

    var setMarker = (lat, lng) => {
      if ($scope.baseMarker) {
        $scope.baseMarker.setMap(null)
        // baseMap.removeLayer($scope.baseMarker)
      }
      $scope.baseMarker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: baseMap,
        icon: baseIcon
      })
      // $scope.baseMarker = L.marker([lat, lng], { icon: baseIcon }).addTo(baseMap)
    }

    $scope.$on('$destroy', () => {
      clearInterval(timer)
    })
  }])

var baseIcon = {
  url: 'base.png',
  anchor: new google.maps.Point(5, 5),
  scaledSize: new google.maps.Size(10, 10)
}


/* var baseIcon = L.icon({
  iconUrl: 'base.png',
  icon10: [10, 10],
  iconAnchor: [5, 5]
}) */
