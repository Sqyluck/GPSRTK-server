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
  $scope.roverId = null
  $scope.tempMarker = null
  $scope.offset = false
  $scope.latOffset = 0
  $scope.lngOffset = 0
  $scope.altitude = 0
  $scope.showMap = false
  $scope.printRecord = null
  $scope.newAltitude = 0

  $scope.select = () => {
    console.log($scope.recordSelect)
    deleteMarkers()
    $scope.records.forEach((record) => {
      if (record._id === $scope.recordSelect) {
        console.log(record)
        $scope.currentRecord = record.data
        console.log($scope.currentRecord)
        loadRecord()
      }
    })
    $scope.recordSelect = null
  }

  $scope.delete = () => {
    console.log($scope.recordDelete)
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/deleteRecord/' + $scope.recordDelete
    }).then((response) => {
      console.log(response)
      $scope.recordDelete = null
      getRecords()
    })
  }

  $scope.newRecord = () => {
    deleteMarkers()
  }

  var getRecords = () => {
    $http({
      method: 'GET',
      url: $scope.ipAddress + '/allRecords'
    }).then((records) => {
      $scope.records = records.data
      $scope.records.forEach((record) => {
        let date = new Date(record.date)
        record.dateStr = date.toLocaleDateString('fr-FR') + ' ' +
         date.getHours().toString().padStart(2, '0') + ':' +
         date.getMinutes().toString().padStart(2, '0') + ':' +
         date.getSeconds().toString().padStart(2, '0')
        console.log(record.dateStr)
      })
      console.log($scope.records)
    })
  }

  $scope.loadRecord = () => {
    if ($scope.recordDownload) {
      console.log($scope.ipAddress + '/load/' + $scope.recordDownload)
      $http({
        method: 'GET',
        url: $scope.ipAddress + '/load/' + $scope.recordDownload
      }).then((data) => {
        let record = data.data
        $scope.printRecord = record
        $scope.newAltitude = (record.trueAltitude ? Number(record.trueAltitude) : 0)
      })
    }
  }

  $scope.downloadRecord = (mode) => {
    if ($scope.recordDownload) {
      window.open($scope.ipAddress + '/download/' + $scope.recordDownload + '/' + mode)
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
              $scope.currentRecord.push({ altitude: rover.altitude - $scope.altitude, lat: rover.latitude, lon: rover.longitude, status: rover.status })
              $scope.markers.push(new google.maps.Marker({
                position: { lat: rover.latitude + $scope.latOffset, lng: rover.longitude + $scope.lngOffset },
                map: map,
                icon: chooseRoverIcon(rover.status),
                clickable: true,
                title: '{' + rover.altitude - $scope.altitude + 'm, ' + rover.latitude + $scope.latOffset + ', ' + rover.longitude + $scope.lngOffset + '}'
              }))
            }
          } else {
            console.log('push length == 0')
            $scope.currentRecord.push({ altitude: rover.altitude - $scope.altitude, lat: rover.latitude, lon: rover.longitude, status: rover.status })
            $scope.markers.push(new google.maps.Marker({
              position: { lat: rover.latitude + $scope.latOffset, lng: rover.longitude + $scope.lngOffset },
              map: map,
              icon: chooseRoverIcon(rover.status),
              clickable: true,
              title: '{' + rover.altitude - $scope.altitude + 'm, ' + rover.latitude + $scope.latOffset + ', ' + rover.longitude + $scope.lngOffset + '}'
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

  var deleteMarkers = () => {
    while ($scope.markers.length !== 0) {
      $scope.markers[0].setMap(null)
      $scope.markers.shift()
    }
    while ($scope.currentRecord.length !== 0) {
      $scope.currentRecord.shift()
    }
  }

  var loadRecord = () => {
    getRecords()
    $scope.currentRecord.forEach((record) => {
      console.log('lat: ' + (record.lat + $scope.latOffset) + ',  lng: ' + (record.lng + $scope.lngOffset))
      $scope.markers.push(new google.maps.Marker({
        position: { lat: record.lat + $scope.latOffset, lng: record.lng + $scope.lngOffset },
        map: map,
        icon: chooseRoverIcon(record.status),
        clickable: true,
        title: '{' + (record.altitude - $scope.altitude) + 'm, ' + record.lat + $scope.latOffset + ', ' + record.lng + $scope.lngOffset + '}'
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
      $scope.altitude = Number(bases[0].altitude)
      bases.forEach((base, index) => {
        if (($scope.bases[index].position.lat !== base.latitude) || ($scope.bases[index].position.lng !== base.longitude)) {
          $scope.bases[index].setMap(null)
          $scope.bases[index] = new google.maps.Marker({
            position: { lat: base.latitude + $scope.latOffset, lng: base.longitude + $scope.lngOffset },
            map: map,
            icon: baseIcon,
            clickable: true,
            title: '{' + (base.altitude - $scope.altitude) + 'm, ' + base.latitude + ', ' + base.longitude + '}'
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
      const p = new google.maps.Marker({
        position: { lat: 50.63252475, lng: 3.02071804 },
        map: map,
        icon: roverIconVert
      })
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
