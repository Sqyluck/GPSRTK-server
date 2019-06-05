/*
Record Controller
 */

angular.module('gpsrtk-app')
  .controller('recordCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $scope.mapMarkers = []
    $scope.rovers = []
    $rootScope.choose(0)

    if ($scope.recordChosen) {
      console.log('keep this record')
    } else {
      $scope.recordChosen = null
    }
    $scope.filterDate = 2
    $scope.showMap = false
    $scope.newAltitude = 0
    $scope.currentDate = Date.now()

    const timer = () => {
      $scope.currentDate = Date.now()
      setTimeout(timer, 60000)
    }
    setTimeout(timer, 60000)

    $scope.timeToString = (time) => {
      let date = new Date(time)
      return date.toLocaleDateString('fr-FR') + ' ' +
       date.getHours().toString().padStart(2, '0') + ':' +
       date.getMinutes().toString().padStart(2, '0') + ':' +
       date.getSeconds().toString().padStart(2, '0')
    }

    $scope.nbFiltered = () => {
      let nb = 0
      $scope.allRecords.forEach((record) => {
        if ($scope.filter(record)) {
          nb++
        }
      })
      return nb
    }

    $scope.filter = (record) => {
      let hours = 3600000
      if ($scope.filterRover) {
        if (($scope.filterRover.length !== 0) && ($scope.filterRover !== record.roverId)) {
          console.log('pas le bon rover false')
          return false
        }
      }
      switch ($scope.filterDate) {
        case 0:
          return (record.date < Date.now() - 48 * hours)
        case 1:
          return ((record.date < Date.now() - 24 * hours) && (record.date >= Date.now() - 48 * hours))
        case 2:
          return (record.date >= Date.now() - 24 * hours)
        default:
          return true
      }
    }

    $scope.getAllRovers = () => {
      return new Promise((resolve, reject) => {
        $http({
          method: 'GET',
          url: $rootScope.ipAddress + '/allRovers'
        }).then((rovers) => {
          console.log(rovers)
          $scope.allRovers = rovers.data
          resolve()
        })
      })
    }
    $scope.getAllRovers()

    // Selction du record
    $scope.allRecords = []

    $scope.getAllRecords = () => {
      console.log('ok')
      return new Promise((resolve, reject) => {
        $http({
          method: 'GET',
          url: $rootScope.ipAddress + '/allRecords'
        }).then((records) => {
          console.log(records.data)
          $scope.allRecords = records.data
          resolve()
        })
      })
    }
    $scope.getAllRecords()

    $scope.loadRecord = (recordId) => {
      console.log(recordId)
      if (recordId) {
        console.log($scope.ipAddress + '/load/' + recordId)
        $http({
          method: 'GET',
          url: $scope.ipAddress + '/load/' + recordId
        }).then((data) => {
          let record = data.data
          console.log(record)
          $scope.recordChosen = record
          $scope.recordChosen.altitude = Number(record.altitude)
          $scope.recordChosen.trueAltitude = (record.trueAltitude ? Number(record.trueAltitude) : 0)
          $scope.newAltitude = (record.trueAltitude ? Number(record.trueAltitude) : 0)
          $scope.showRecordOnMap($scope.showMap)
        })
      }
    }

    // Record informations in array
    $scope.downloadRecord = (mode) => {
      if ($scope.recordChosen) {
        window.open($scope.ipAddress + '/download/' + $scope.recordChosen._id + '/' + mode)
      }
    }

    $scope.saveAltitude = () => {
      if (typeof $scope.newAltitude === 'number') {
        console.log($scope.newAltitude)
        $http({
          method: 'GET',
          url: $scope.ipAddress + '/setAltitude/' + $scope.recordChosen.baseId + '/' + $scope.newAltitude
        }).then((data) => {
          $scope.actualize()
        })
      } else {
        console.log('unvalid: ' + $scope.newAltitude)
      }
    }

    // Record display on map
    $scope.showRecordOnMap = (show) => {
      if ($scope.showMap !== show) {
        $scope.showMap = show
      }
      if (show) {
        initMap($scope.recordChosen.data[0].lat, $scope.recordChosen.data[0].lng)
        $scope.recordChosen.data.forEach((record) => {
          $scope.mapMarkers.push(new google.maps.Marker({
            position: { lat: record.lat, lng: record.lng },
            map: $rootScope.map,
            icon: roverIconVert,
            clickable: true,
            title: $scope.timeToString(record.date) + ' : ' + (Math.round(record.alt * 1000) / 1000) + 'm => ' + (Math.round((record.alt + $scope.recordChosen.trueAltitude) * 1000) / 1000) + 'm'
          }))
        })
      }
    }

    $scope.backToList = () => {
      $scope.recordChosen = null
      if ($scope.mapMarkers.length !== 0) {
        deleteMarkers()
      }
    }

    $scope.actualize = () => {
      $scope.getAllRecords().then(() => {
        $scope.allRecords.forEach((record) => {
          if ($scope.recordChosen) {
            console.log($scope.recordChosen)
            if (record._id === $scope.recordChosen._id) {
              $scope.loadRecord(record._id)
              // $scope.$apply()
            }
          }
        })
      })
    }

    var deleteMarkers = () => {
      while ($scope.mapMarkers.length !== 0) {
        $scope.mapMarkers[0].setMap(null)
        $scope.mapMarkers.shift()
      }
    }

    var initMap = (lat, lon) => {
      console.log('initMap')
      $rootScope.map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(lat, lon),
        zoom: 15,
        maxZoom: 30,
        mapTypeId: 'satellite',
        tilt: 0,
        heading: 360,
        draggableCursor: 'crosshair',
        gestureHandling: 'greedy'
      })
    }
  }])

const iSize = 10

var roverIconVert = {
  url: 'pointVert.png',
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}
