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

    var baseReel = { lat: 50.58945860, lng: 3.17600015 }
    var baseReelMarker = null

    var latOffset = 0 // -0.000007
    var lngOffset = 0 // 0.000006
    var click = null

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
      $scope.baseChosen.rtcmLength = 0
      $scope.baseChosen.rtcm.forEach((rtcm) => {
        // console.log(rtcm)
        $scope.baseChosen.rtcmLength += (rtcm.data.length / 2)
      })
      initBaseMap($scope.baseChosen.latitude, $scope.baseChosen.longitude)
      setMarker($scope.baseChosen.latitude, $scope.baseChosen.longitude)
      baseReelMarker = new google.maps.Marker({
        position: { lat: baseReel.lat, lng: baseReel.lng },
        map: baseMap,
        icon: {
          url: 'pointBlanc.png',
          anchor: new google.maps.Point(5, 5),
          scaledSize: new google.maps.Size(10, 10)
        },
        zIndex: 1
      })
    }

    $scope.modifyBase = (mode) => {
      if (mode === 'ALT') {
        if (typeof $scope.newAltitude === 'number') {
          $http({
            method: 'GET',
            url: $scope.ipAddress + '/setAltitude/' + $scope.baseChosen._id + '/' + $scope.newAltitude
          })
        }
      } else if (mode === 'SVIN') {
        if (typeof $scope.newAcc === 'number') {
          if ($scope.baseChosen.connected) {
            console.log($scope.ipAddress + '/changeAcc/' + $scope.baseChosen._id + '/' + (Math.round($scope.newAcc * 100)))
            $http({
              method: 'GET',
              url: $scope.ipAddress + '/changeAcc/' + $scope.baseChosen._id + '/' + (Math.round($scope.newAcc * 100))
            })
          } else {
            window.alert('Impossible, cette base n\'est pas connectée')
          }
        }
      } else if (mode === 'FIXED') {
        if ((typeof $scope.newlat === 'number') && (typeof $scope.newlng === 'number') && (typeof $scope.newhei === 'number')) {
          if ($scope.baseChosen.connected) {
            $http({
              method: 'GET',
              url: $scope.ipAddress + '/changeLLH/' + $scope.baseChosen._id + '/' + (Math.round($scope.newlat * 10000000)) + '/' + (Math.round($scope.newlng * 10000000)) + '/' + (Math.round($scope.newhei * 100))
            })
            $scope.newlat = null
            $scope.newlng = null
            $scope.newhei = null
          } else {
            window.alert('Impossible, cette base n\'est pas connectée')
          }
        }
      }


      $scope.actualize()
      $scope.newAcc = null
      $scope.newAltitude = null
    }

    $scope.downloadBase = () => {
      if ($scope.baseChosen) {
        console.log($scope.baseChosen._id)
        window.open($scope.ipAddress + '/downloadBase/' + $scope.baseChosen._id)
      }
    }

    $scope.backToList = () => {
      $scope.baseChosen = null
    }

    $scope.fillWithCurrentValue = () => {
      $scope.newlat = Math.round($scope.baseChosen.latitude * 10000000) / 10000000
      $scope.newlng = Math.round($scope.baseChosen.longitude * 10000000) / 10000000
      $scope.newhei = Math.round((Number($scope.baseChosen.height) + Number($scope.baseChosen.altitude)) * 100) / 100
    }

    $scope.actualize = () => {
      $scope.getAllBases().then(() => {
        $scope.allBases.forEach((base) => {
          if ($scope.baseChosen) {
            if (base._id === $scope.baseChosen._id) {
              $scope.baseChosen = base
              $scope.baseChosen.rtcmLength = 0
              console.log((typeof $scope.baseChosen.height) + ' ' + (typeof $scope.baseChsoen.altitude))
              setMarker(base.latitude, base.longitude)
              $scope.baseChosen.rtcm.forEach((rtcm) => {
                $scope.baseChosen.rtcmLength += (rtcm.data.length / 2)
              })
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
      baseMap.addListener('click', (event) => {
        if (click) {
          click.setMap(null)
        }
        $scope.newlat = Math.round(event.latLng.lat() * 10000000) / 10000000
        $scope.newlng = Math.round(event.latLng.lng() * 10000000) / 10000000
        $scope.newhei = Math.round((Number($scope.baseChosen.height) + Number($scope.baseChosen.altitude)) * 100) / 100

        click = new google.maps.Marker({
          position: { lat: $scope.newlat, lng: $scope.newlng },
          map: baseMap,
          icon: {
            url: 'pointBlanc.png',
            anchor: new google.maps.Point(10, 10),
            scaledSize: new google.maps.Size(20, 20)
          },
          zIndex: 1
        })
        $scope.$apply()
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
        position: { lat: lat + latOffset, lng: lng + lngOffset },
        map: baseMap,
        icon: baseIcon,
        zIndex: 5
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

var baseReel = {
  url: 'pointBlanc.png',
  anchor: new google.maps.Point(6, 6),
  scaledSize: new google.maps.Size(12, 12)
}


/* var baseIcon = L.icon({
  iconUrl: 'base.png',
  icon10: [10, 10],
  iconAnchor: [5, 5]
}) */
