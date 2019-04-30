var app = angular.module('gpsrtk-app', [])


const latOffset = 0.000000
const lngOffset = 0.000000
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

  $scope.records = [{ name: 'test1', _id: 55 },
    { name: 'test2', _id: 56 },
    { name: 'test3', _id: 57 }]

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

  $scope.saveRecord = () => {
    let record = {
      name: $scope.saveName,
      data: $scope.currentRecord
    }
    console.log(record)
    console.log('save record')
    $http({
      method: 'POST',
      url: $scope.ipAddress + '/saveRecord',
      data: record
    }).then((res) => {
      console.log(res)
      $scope.saveName = null
      getRecords()
    })
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
              $scope.currentRecord.push({ lat: rover.latitude + latOffset, lon: rover.longitude + lngOffset, status: rover.status })
              $scope.markers.push(new google.maps.Marker({
                position: { lat: rover.latitude + latOffset, lng: rover.longitude + lngOffset },
                map: map,
                icon: chooseRoverIcon(rover.status),
                clickable: false
              }))
            }
          } else {
            console.log('push length == 0')
            $scope.currentRecord.push({ lat: rover.latitude + latOffset, lon: rover.longitude + lngOffset, status: rover.status })
            $scope.markers.push(new google.maps.Marker({
              position: { lat: rover.latitude + latOffset, lng: rover.longitude + lngOffset },
              map: map,
              icon: chooseRoverIcon(rover.status),
              clickable: false
            }))
          }
        } else {
          if ($scope.tempMarker) {
            $scope.tempMarker.setMap(null)
            $scope.tempMarker =  new google.maps.Marker({
              position: { lat: rover.latitude + latOffset, lng: rover.longitude + lngOffset },
              map: map,
              icon: chooseRoverIcon(rover.status),
              clickable: false
            })
          } else {
            $scope.tempMarker =  new google.maps.Marker({
              position: { lat: rover.latitude + latOffset, lng: rover.longitude + lngOffset },
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
    $scope.currentRecord.forEach((record) => {
      $scope.markers.push(new google.maps.Marker({
        position: { lat: record.lat, lng: record.lon },
        map: map,
        icon: chooseRoverIcon(record.status),
        clickable: false
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
        console.log($scope.bases[index].position.lat() + ' ' + base.latitude + ' ' + $scope.bases[index].position.lng() + ' ' + base.longitude)
        if (($scope.bases[index].position.lat !== base.latitude) || ($scope.bases[index].position.lng !== base.longitude)) {
          $scope.bases[index].setMap(null)
          $scope.bases[index] = new google.maps.Marker({
            position: { lat: base.latitude + latOffset, lng: base.longitude + lngOffset },
            map: map,
            icon: baseIcon,
            clickable: false
          })
          change = true
        }
      })
      console.log(change)
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
          position: { lat: base.latitude + latOffset, lng: base.longitude + lngOffset },
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

/* const showPrecisePoint = () => {
  http.open('GET', ipAddress + '/allRovers', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let rovers = JSON.parse(http.response)
      rovers.forEach((rover, index) => {
        if (followRover) {
          if (markers[0]) {
            map.setCenter(markers[0].marker.position)
          } else {
            console.log('no rover')
          }
        }
        if (markers[index]) {
          if (rover.fixed) {
            if (markers[index].fixed === false) {
              markers[index].fixed = true
              if (markers[index].marker) {
                markers[index].marker.setMap(null)
              }
              markers[index].marker = new google.maps.Marker({
                title: 'position: {' + rover.latitude + ', ' + rover.longitude + '}',
                position: { lat: rover.latitude + latOffset, lng: rover.longitude + lngOffset },
                icon: chooseRoverIcon(rover.status),
                map: map
              })
            }
          } else {
            if ((markers[index].marker) && (markers[index].fixed === false)) {
              markers[index].marker.setMap(null)
            }
            if (markers[index].fixed === true) {
              markers[index].fixed = false
            }
            markers[index].marker = new google.maps.Marker({ position: { lat: rover.latitude + latOffset, lng: rover.longitude + lngOffset }, map: map, icon: chooseRoverIcon(rover.status), clickable: false })
          }
        } else {
          markers[index] = { marker: null, fixed: false }
        }
      })
      setTimeout(showPrecisePoint, 1000)
    }
  }
}

const distance = (lat1, lon1, lat2, lon2) => {
  var p = 0.017453292519943295 // Math.PI / 180
  var c = Math.cos
  var a = 0.5 - c((lat2 - lat1) * p) / 2 +
          c(lat1 * p) * c(lat2 * p) *
          (1 - c((lon2 - lon1) * p)) / 2
  return 12742 * Math.asin(Math.sqrt(a))
} */
