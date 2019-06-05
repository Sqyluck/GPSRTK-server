var app = angular.module('gpsrtk-app', [])

// const $scope.latOffset = 0.000000
// const $scope.lngOffset = 0.000000
var mouseMarker = null

app.controller('main', ['$scope', '$http', function ($scope, $http) {
  $scope.ipAddress = 'http://rtk.noolitic.com:3000'

  $scope.markers = []
  $scope.currentRecord = []
  $scope.records = []
  $scope.rovers = []
  $scope.bases = []
  $scope.sockets = []
  $scope.roverId = null
  $scope.tempMarker = null
  $scope.offset = false
  $scope.latOffset = 0
  $scope.lngOffset = 0
  $scope.showMap = false
  $scope.printRecord = null
  $scope.newAltitude = 0
  $scope.currentDate = Date.now()
  $scope.recordSelection = true
  $scope.filterDate = 2

  const timer = () => {
    $scope.currentDate = Date.now()
    setTimeout(timer, 60000)
  }
  setTimeout(timer, 60000)

  $scope.newRecord = () => {
    deleteMarkers()
  }


  var getRecords = () => {
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/allRecords'
    }).then((records) => {
      $scope.records = records.data
      console.log($scope.records)
    })
  }

  $scope.getSockets = () => {
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/allSockets'
    }).then((data) => {
      $scope.sockets = []
      data.data.forEach((socket) => {
        $scope.sockets.push({ id: socket, acc: null })
      })
      console.log($scope.sockets)
    })
  }

  $scope.changeBaseAcc = (socket) => {
    console.log(socket)
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/changeAcc/' + socket.id.key + '/' + (Number(socket.acc) * 10000)
    }).then((res) => {
      // socket.acc = null
    })
  }

  $scope.loadRecord = (recId) => {
    if (recId) {
      $scope.recordId = recId
      $scope.recordSelection = false
    }
    if ($scope.recordId) {
      console.log($scope.ipAddress + '/load/' + $scope.recordId)
      $http({
        method: 'GET',
        url: $scope.ipAddress + '/load/' + $scope.recordId
      }).then((data) => {
        let record = data.data
        $scope.printRecord = record
        $scope.printRecord.altitude = Number(record.altitude)
        $scope.printRecord.trueAltitude = (record.trueAltitude ? Number(record.trueAltitude) : 0)
        $scope.newAltitude = (record.trueAltitude ? Number(record.trueAltitude) : 0)
        showRecordOnMap()
      })
    }
  }

  $scope.downloadRecord = (mode) => {
    if ($scope.recordId) {
      window.open($scope.ipAddress + '/download/' + $scope.recordId + '/' + mode)
    }
  }

  $scope.saveAltitude = () => {
    if ($scope.newAltitude) {
      console.log($scope.newAltitude)
      $http({
        method: 'GET',
        url: $scope.ipAddress + '/setAltitude/' + $scope.printRecord.baseId + '/' + $scope.newAltitude
      }).then((data) => {
        console.log(data)
      })
    } else {
      console.log('unvalid: ' + $scope.newAltitude)
    }
  }

  var getRovers = () => {
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/allRovers'
    }).then((rovers) => {
      rovers.data.forEach((rover) => {
        let macAddr = ''
        for (let i = 0; i < 8; i++) {
          if (i !== 0) {
            macAddr += ':'
          }
          macAddr += rover.macAddr[i].toString(16).padStart(2, '0')
        }
        console.log(macAddr)
        $scope.rovers.push({
          macAddr: macAddr,
          _id: rover._id
        })
      })
      console.log($scope.rovers)
    })
  }

  $scope.setOffset = () => {
    if (($scope.lat != null) && ($scope.lng != null) && ($scope.lat !== '') && ($scope.lng !== '')) {
      $scope.latOffset = Number($scope.lat)
      $scope.lngOffset = Number($scope.lng)
    }
  }

  $scope.clearOffset = () => {
    $scope.latOffset = 0
    $scope.lngOffset = 0
  }

  $scope.showPrecisePoint = () => {
    if ($scope.roverId) {
      $http({
        method: 'GET',
        url: $scope.ipAddress + '/getRover/' + $scope.roverId
      }).then((data) => {
        let rover = data.data
        if (rover.fixed) {
          if ($scope.tempMarker) {
            $scope.tempMarker.setMap(null)
            $scope.tempMarker = null
          }
          if ($scope.currentRecord.length > 0) {
            if ($scope.currentRecord[$scope.currentRecord.length - 1].lat !== rover.latitude) {
              console.log('push length > 0')
              $scope.currentRecord.push({ altitude: rover.altitude, lat: rover.latitude, lon: rover.longitude, status: rover.status })
              $scope.markers.push(new google.maps.Marker({
                position: { lat: rover.latitude + $scope.latOffset, lng: rover.longitude + $scope.lngOffset },
                map: map,
                icon: chooseRoverIcon(rover.status),
                clickable: true,
                title: '{' + rover.altitude + 'm, ' + rover.latitude + $scope.latOffset + ', ' + rover.longitude + $scope.lngOffset + '}'
              }))
            }
          } else {
            console.log('push length == 0')
            $scope.currentRecord.push({ altitude: rover.altitude, lat: rover.latitude, lon: rover.longitude, status: rover.status })
            $scope.markers.push(new google.maps.Marker({
              position: { lat: rover.latitude + $scope.latOffset, lng: rover.longitude + $scope.lngOffset },
              map: map,
              icon: chooseRoverIcon(rover.status),
              clickable: true,
              title: '{' + rover.altitude + 'm, ' + rover.latitude + $scope.latOffset + ', ' + rover.longitude + $scope.lngOffset + '}'
            }))
          }
        } else {
          if ($scope.tempMarker) {
            $scope.tempMarker.setMap(null)
            $scope.tempMarker =  new google.maps.Marker({
              position: { lat: rover.latitude + $scope.latOffset, lng: rover.longitude + $scope.lngOffset },
              map: map,
              icon: chooseRoverIcon(rover.status),
              clickable: false
            })
          } else {
            $scope.tempMarker =  new google.maps.Marker({
              position: { lat: rover.latitude + $scope.latOffset, lng: rover.longitude + $scope.lngOffset },
              map: map,
              icon: chooseRoverIcon(rover.status),
              clickable: false
            })
          }
        }
      })
      setTimeout($scope.showPrecisePoint, 1000)
    }
  }

  $scope.followRover = () => {
    $scope.roverId = $scope.roverSelect
    $scope.roverSelect = null
    if ($scope.roverId) {
      $scope.macAddr = $scope.rovers.find(rover => rover._id === $scope.roverId).macAddr
    }
    $scope.showPrecisePoint()
  }

  $scope.timeToString = (time) => {
    let date = new Date(time)
    return date.toLocaleDateString('fr-FR') + ' ' +
     date.getHours().toString().padStart(2, '0') + ':' +
     date.getMinutes().toString().padStart(2, '0') + ':' +
     date.getSeconds().toString().padStart(2, '0')
  }

  $scope.hoursToMilli = (hour) => {
    return (Number(hour) * 3600 * 1000)
  }

  var deleteMarkers = () => {
    while ($scope.markers.length !== 0) {
      $scope.markers[0].setMap(null)
      $scope.markers.shift()
    }
    while ($scope.currentRecord.length !== 0) {
      $scope.currentRecord.shift()
    }
  }

  var showRecordOnMap = () => {
    deleteMarkers()
    // TODO: set map center on record[0]
    $scope.printRecord.data.forEach((record) => {
      $scope.markers.push(new google.maps.Marker({
        position: { lat: record.lat + $scope.latOffset, lng: record.lng + $scope.lngOffset },
        map: map,
        icon: (record.status ? chooseRoverIcon(record.status) : roverIconVert),
        clickable: true,
        title: $scope.timeToString(record.date) + ' : ' + (Math.round(record.alt * 1000) / 1000) + 'm => ' + (Math.round((record.alt + $scope.printRecord.trueAltitude) * 1000) / 1000) + 'm'
      }))
    })
  }

  var base = () => {
    var change = false
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/allBases'
    }).then((data) => {
      let bases = data.data
      bases.forEach((base, index) => {
        if (($scope.bases[index].position.lat !== base.latitude) || ($scope.bases[index].position.lng !== base.longitude)) {
          $scope.bases[index].setMap(null)
          $scope.bases[index] = new google.maps.Marker({
            position: { lat: base.latitude + $scope.latOffset, lng: base.longitude + $scope.lngOffset },
            map: map,
            icon: baseIcon,
            clickable: true,
            title: '{' + (base.trueAltitude) + 'm, ' + base.latitude + ', ' + base.longitude + '}'
          })
          change = true
        }
      })
      if (change) {
        setTimeout(base, 2000)
      }
    })
  }

  var init = () => {
    console.log('init')
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/allBases'
    }).then((data) => {
      let bases = data.data
      console.log(bases[0])
      initMap(bases[0].latitude, bases[0].longitude)
      bases.forEach((base) => {
        console.log(base)
        $scope.bases.push(new google.maps.Marker({
          position: { lat: base.latitude + $scope.latOffset, lng: base.longitude + $scope.lngOffset },
          map: map,
          icon: baseIcon,
          clickable: false
        }))
      })
      setTimeout(base, 2000)
    })
    getRovers()
    getRecords()
  }
  init()
}])

var map = null
const iSize = 10

var initMap = (lat, lon) => {
  console.log('initMap')
  this.map = new google.maps.Map(document.getElementById('map'), {
    center: new google.maps.LatLng(lat, lon),
    zoom: 20,
    maxZoom: 30,
    mapTypeId: 'satellite',
    tilt: 0,
    heading: 360,
    draggableCursor: 'crosshair',
    gestureHandling: 'greedy'
  })
  this.map.addListener('click', (event) => {
    addMarker(event.latLng)
  })
}

const addMarker = (latlng) => {
  if (mouseMarker) {
    mouseMarker.setMap(null)
    mouseMarker = null
  }
  let title = '[' + latlng.lat() + ', ' + latlng.lng() + ']'
  console.log(title)
  mouseMarker = new google.maps.Marker({ position: latlng, map: map, title: title })
}

var roverIconVert = {
  url: 'pointVert.png',
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var roverIconOrange = {
  url: 'pointOrange.png',
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var roverIconJaune = {
  url: 'pointJaune.png',
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var roverIconRouge = {
  url: 'pointRouge.png',
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var baseIcon = {
  url: 'base.png',
  anchor: new google.maps.Point(18 / 2, 18 / 2),
  scaledSize: new google.maps.Size(18, 18)
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
