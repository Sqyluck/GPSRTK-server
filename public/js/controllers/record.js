/*
Record Controller
 */

var recordMap = null

angular.module('gpsrtk-app')
  .controller('recordCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $scope.mapMarkers = []
    $scope.rovers = []
    $rootScope.choose(0)
    $scope.recordChosen = null
    $scope.filterDate = 2
    $scope.showMap = false
    $scope.newAltitude = 0
    $scope.currentDate = Date.now()

    const timer = setInterval(() => {
      $scope.currentDate = Date.now()
    }, 60000)

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
          $scope.allRovers = rovers.data
          resolve()
        })
      })
    }
    $scope.getAllRovers()

    // Selction du record
    $scope.allRecords = []

    $scope.getAllRecords = () => {
      return new Promise((resolve, reject) => {
        $http({
          method: 'GET',
          url: $rootScope.ipAddress + '/allRecords'
        }).then((records) => {
          $scope.allRecords = records.data
          resolve()
        })
      })
    }
    $scope.getAllRecords()

    $scope.loadRecord = (recordId) => {
      if (recordId) {
        $http({
          method: 'GET',
          url: $scope.ipAddress + '/allBases'
        }).then((data) => {
          let bases = data.data
          $http({
            method: 'GET',
            url: $scope.ipAddress + '/load/' + recordId
          }).then((data) => {
            let record = data.data
            var res = bases.find((base) => {
              return base._id === record.baseId
            })
            $scope.recordChosen = record
            console.log(res.latitude + ', ' + res.longitude + ', ' + $scope.recordChosen.data[0].lat + ', ' + $scope.recordChosen.data[0].lng)
            $scope.recordChosen.distance = distance(res.latitude, res.longitude, $scope.recordChosen.data[0].lat, $scope.recordChosen.data[0].lng)
            console.log($scope.recordChosen.distance)
            $scope.recordChosen.altitude = Number(record.altitude)
            $scope.recordChosen.trueAltitude = (record.trueAltitude ? Number(record.trueAltitude) : 0)
            $scope.newAltitude = (record.trueAltitude ? Number(record.trueAltitude) : 0)
            $scope.showRecordOnMap($scope.showMap)
          })
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
        initRecordMap($scope.recordChosen.data[0].lat, $scope.recordChosen.data[0].lng)
        $scope.recordChosen.data.forEach((record) => {
          $scope.mapMarkers.push(addMarker(record.lat, record.lng, record.alt, record.status))
        })
      }
    }

    $scope.deleteRecord = () => {
      if ($scope.recordChosen._id) {
        $http({
          method: 'GET',
          url: $scope.ipAddress + '/deleteRecord/' + $scope.recordChosen._id
        }).then((data) => {
          $scope.backToList()
          $scope.actualize()
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
        // recordMap.removeLayer($scope.mapMarkers[0])
        $scope.mapMarkers.shift()
      }
    }

    var addMarker = (lat, lng, alt, status) => {
      return (new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: recordMap,
        icon: (status ? iconFixed : iconFloat),
        title: alt + 'm => ' + (alt + $scope.newAltitude) + 'm'
      }))
      // return L.marker([lat, lng], { icon: icon }).addTo(recordMap)
    }

    $scope.$on('$destroy', () => {
      clearInterval(timer)
    })
  }])

const size = 10

var initRecordMap = (lat, lng) => {
  recordMap = new google.maps.Map(document.getElementById('recordMap'), {
    center: new google.maps.LatLng(lat, lng),
    zoom: 20,
    maxZoom: 30,
    mapTypeId: 'satellite',
    tilt: 0,
    heading: 360,
    draggableCursor: 'crosshair',
    gestureHandling: 'greedy'
  })
  /* return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('init1')
      recordMap = L.map('recordMap').setView([lat, lng], 18)
      L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        minZoom: 1,
        maxZoom: 20
      }).addTo(recordMap)
      console.log('init2')
      setTimeout(() => {
        resolve()
      }, 1000)
    }, 1000)
  }) */
}

const distance = (lat1, lon1, lat2, lon2) => {
  var p = 0.017453292519943295 // Math.PI / 180
  var c = Math.cos
  var a = 0.5 - c((lat2 - lat1) * p) / 2 +
          c(lat1 * p) * c(lat2 * p) *
          (1 - c((lon2 - lon1) * p)) / 2
  return 12742 * Math.asin(Math.sqrt(a))
}

var iconFixed = {
  url: 'pointVert.png',
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

var iconFloat = {
  url: 'pointRouge.png',
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

/*
var iconFixed = L.icon({
  iconUrl: 'pointVert.png',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2]
})
*/
