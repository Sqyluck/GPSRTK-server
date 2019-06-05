/*
Record Controller
 */

angular.module('gpsrtk-app')
  .controller('roverCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $rootScope.choose(2)
    $scope.roverMap = null
    $scope.allRovers = []

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
      initMap(rover.latitude, rover.longitude)
      $scope.roverMarkers = []
      $scope.roverMarkers.push(addMarker(rover.latitude, rover.longitude, rover.status))
      $scope.showRover()
    }

    $scope.showRover = () => {
      if ($scope.roverChosen) {
        $http({
          method: 'GET',
          url: $rootScope.ipAddress + '/getRover/' + $scope.roverChosen._id
        }).then((data) => {
          let rover = data.data
          if (!isAtTheSamePosition($scope.roverMarkers[$scope.roverMarkers.length - 1].position.lat(), rover.latitude,
            $scope.roverMarkers[$scope.roverMarkers.length - 1].position.lng(), rover.longitude)) {
            console.log('newPosition')
            if (!rover.fixed) {
              $scope.roverMarkers[$scope.roverMarkers.length - 1].setMap(null)
              $scope.roverMarkers[$scope.roverMarkers.length - 1] = addMarker(rover.latitude, rover.longitude, rover.status)
            } else {
              console.log('new Marker')
              $scope.roverMarkers[$scope.roverMarkers.length - 1].setMap(null)
              $scope.roverMarkers[$scope.roverMarkers.length - 1] = addMarker(rover.latitude, rover.longitude, rover.status)
              $scope.roverMarkers.push(addMarker(rover.latitude, rover.longitude, rover.status))
            }
          } else {
            console.log('rover doesn\'t move')
          }
        })
        setTimeout($scope.showRover, 2000)
      }
    }

    var addMarker = (lat, lng, status) => {
      console.log('{' + lat + ', ' + lng + ', ' + status + '}')
      return (new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: $scope.roverMap,
        icon: chooseRoverIcon(status)
      }))
    }

    var initMap = (lat, lng) => {
      console.log('initMap')
      $scope.roverMap = new google.maps.Map(document.getElementById('roverMap'), {
        center: new google.maps.LatLng(lat, lng),
        zoom: 20,
        maxZoom: 30,
        mapTypeId: 'satellite',
        tilt: 0,
        heading: 360,
        draggableCursor: 'crosshair',
        gestureHandling: 'greedy'
      })
    }

    $scope.clearMap = () => {
      deleteMarkers()
    }

    var deleteMarkers = () => {
      while ($scope.roverMarkers.length !== 0) {
        $scope.roverMarkers[0].setMap(null)
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

const size = 10

var roverIconVert = {
  url: 'pointVert.png',
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

var roverIconOrange = {
  url: 'pointOrange.png',
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

var roverIconJaune = {
  url: 'pointJaune.png',
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

var roverIconRouge = {
  url: 'pointRouge.png',
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

const chooseRoverIcon = (status) => {
  switch (status) {
    case 'invalid':
      return roverIconRouge
    case '2D/3D':
      return roverIconRouge
    case 'DGNSS':
      return roverIconOrange
    case 'Fixed RTK':
      return roverIconVert
    case 'Float RTK':
      return roverIconJaune
    default:
      return roverIconRouge
  }
}

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
