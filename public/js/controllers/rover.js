/*
Record Controller
 */
const round = (val) => {
  return (Math.round(val * 1000000) / 1000000)
}

const isAtTheSamePosition = (lat1, lat2, lng1, lng2) => {
  lat1 = round(lat1)
  lng1 = round(lng1)
  lat2 = round(lat2)
  lng2 = round(lng2)
  return ((lat1 === lat2) && (lng1 === lng2))
}

var roverMap = null

angular.module('gpsrtk-app')
  .controller('roverCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $rootScope.choose(2)
    $scope.allRovers = []
    $scope.showMap = true
    var loop = null

    $scope.getAllRovers = () => {
      return new Promise((resolve, reject) => {
        $http({
          method: 'GET',
          url: $rootScope.ipAddress + '/allRovers'
        }).then((data) => {
          $scope.allRovers = data.data
          console.log($scope.allRovers)
          resolve()
        })
      })
    }

    $scope.getAllRovers()

    $scope.loadRover = (rover) => {
      console.log(rover)
      $scope.roverChosen = rover
      initRoverMap(rover.latitude, rover.longitude)
      $scope.roverMarkers = []
      console.log(typeof rover.latitude + ' ' + typeof rover.longitude)
      $scope.roverMarkers.push(addMarker(rover.latitude, rover.longitude, rover.status))
      $scope.showRoverMap(true)
    }

    $scope.showRover = (show) => {
      let rover = null
      if ($scope.roverChosen) {
        $http({
          method: 'GET',
          url: $rootScope.ipAddress + '/getRover/' + $scope.roverChosen._id
        }).then((data) => {
          rover = data.data
          if (show) {
            if ($scope.roverMarkers.length !== 0) {
              if (!isAtTheSamePosition($scope.roverMarkers[$scope.roverMarkers.length - 1].position.lat(), rover.latitude,
                $scope.roverMarkers[$scope.roverMarkers.length - 1].position.lng(), rover.longitude)) {
                $scope.roverMarkers[$scope.roverMarkers.length - 1].setMap(null)
                // roverMap.removeLayer($scope.roverMarkers[$scope.roverMarkers.length - 1])
                $scope.roverMarkers[$scope.roverMarkers.length - 1] = addMarker(rover.latitude, rover.longitude, rover.status)
                if (rover.fixed) {
                  $scope.roverMarkers.push(addMarker(rover.latitude, rover.longitude, rover.status))
                }
              }
            } else {
              $scope.roverMarkers.push(addMarker(rover.latitude, rover.longitude, rover.status))
            }
            // setTimeout($scope.showRover, 2000, show)
          } else {
            $scope.roverChosen.satellites = rover.satellites
            $scope.roverChosen.satellites.sort(compare)
            $scope.satValid = 0
            $scope.satRTCM = 0
            $scope.roverChosen.satellites.forEach((sat) => {
              $scope.satValid += (sat.health === 1 ? 1 : 0)
              $scope.satRTCM += sat.RTCM
            })
            console.log(rover.satellites)
            // setTimeout($scope.showRover, 2000, show)
          }
        })
      }
    }

    var compare = (a, b) => {
      if (a.az > b.az) {
        return 1
      }
      if (a.az < b.az) {
        return -1
      }
      return 0
    }

    $scope.showRoverMap = (show) => {
      clearInterval(loop)
      $scope.showMap = show
      if (show) {
        $scope.showRover(show)
        loop = setInterval($scope.showRover, 2000, show)
      } else {
        $scope.showRover(show)
      }
    }

    $scope.getQuality = (quality) => {
      switch (quality) {
        case 0:
          return 'grey'
        case 1:
          return 'red'
        case 2:
          return 'orange'
        case 3:
          return 'orange'
        case 4:
          return 'yellow'
        case 5:
          return 'yellow'
        case 6:
          return 'cyan'
        case 7:
          return 'lime'
      }
    }

    var addMarker = (lat, lng, status) => {
      return (new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: roverMap,
        icon: chooseRoverIcon(status)
      }))
      // return L.marker([lat, lng], { icon: chooseRoverIcon(status) }).addTo(roverMap)
    }

    $scope.clearMap = () => {
      deleteMarkers()
    }

    $scope.$on('$destroy', () => {
      deleteMarkers()
      $scope.roverChosen = null
    })

    var deleteMarkers = () => {
      while ($scope.roverMarkers.length !== 0) {
        $scope.roverMarkers[0].setMap(null)
        // roverMap.removeLayer($scope.roverMarkers[0])
        $scope.roverMarkers.shift()
      }
    }

    $scope.backToList = () => {
      $scope.roverChosen = null
      if ($scope.roverMarkers.length !== 0) {
        deleteMarkers()
      }
    }
  }])

var initRoverMap = (lat, lng) => {
  roverMap = new google.maps.Map(document.getElementById('roverMap'), {
    center: new google.maps.LatLng(lat, lng),
    zoom: 20,
    maxZoom: 30,
    mapTypeId: 'satellite',
    tilt: 0,
    heading: 360,
    draggableCursor: 'crosshair',
    gestureHandling: 'greedy'
  })
  console.log('initMap')
  /* return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!roverMap) {
        roverMap = L.map('roverMap').setView([lat, lng], 18)
      }
      L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        minZoom: 1,
        maxZoom: 20
      }).addTo(roverMap)
    }, 1000)
    setTimeout(() => {
      resolve()
    }, 2000)
  }) */
}

var roverIconFixed = {
  url: 'pointVert.png',
  anchor: new google.maps.Point(5, 5),
  scaledSize: new google.maps.Size(10, 10)
}

var roverIconDGNSS = {
  url: 'pointOrange.png',
  anchor: new google.maps.Point(5, 5),
  scaledSize: new google.maps.Size(10, 10)
}

var roverIconFloat = {
  url: 'pointJaune.png',
  anchor: new google.maps.Point(5, 5),
  scaledSize: new google.maps.Size(10, 10)
}

var roverIcon3D = {
  url: 'pointRouge.png',
  anchor: new google.maps.Point(5, 5),
  scaledSize: new google.maps.Size(10, 10)
}

/* var roverIcon3D = L.icon({
  iconUrl: 'pointRouge.png',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
})

var roverIconDGNSS = L.icon({
  iconUrl: 'pointOrange.png',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
})

var roverIconFloat = L.icon({
  iconUrl: 'pointJaune.png',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
})

var roverIconFixed = L.icon({
  iconUrl: 'pointVert.png',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
}) */

const chooseRoverIcon = (status) => {
  switch (status) {
    case 'invalid':
      return roverIcon3D
    case '2D/3D':
      return roverIcon3D
    case 'DGNSS':
      return roverIconDGNSS
    case 'Fixed RTK':
      return roverIconFixed
    case 'Float RTK':
      return roverIconFloat
    default:
      return roverIcon3D
  }
}
