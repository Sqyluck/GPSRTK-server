const ipAddress = 'http://localhost:3000'
const http = new XMLHttpRequest()

var map = null
const iSize = 10
const size = 15
var markers = {}
var base = null
var allMarkers = []
var truePosition = [50.632338576277775, 3.02044102992852]
var mouseMarker = null

// Fonction d'initialisation de la carte
const initMap = () => {
  // [50.63227727189547, 3.0209262781542066]
  var lat = 50.63227727189547
  var lon = 3.0209262781542066
  map = new google.maps.Map(document.getElementById('map'), {
    center: new google.maps.LatLng(lat, lon),
    zoom: 20,
    maxZoom: 30,
    mapTypeId: 'satellite',
    tilt: 0,
    heading: 360,
    draggableCursor: 'crosshair',
    gestureHandling: 'greedy'
    // mapTypeControl: true,
    // navigationControl: true,
    // navigationControlOptions: {
    //   style: google.maps.NavigationControlStyle.ZOOM_PAN
    // }
  })
  map.addListener('click', (event) => {
    addMarker(event.latLng)
  })
}


const addMarker = (latlng) => {
  if (mouseMarker) {
    mouseMarker.setMap(null)
    mouseMarker = null
  }
  let title = '[' + latlng.lat() + ', ' + latlng.lng() + ']'
  // console.log(title)
  mouseMarker = new google.maps.Marker({ position: latlng, map: map, title: title })
}

const getBase = () => {
  http.open('GET', ipAddress + '/allBases', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let res = JSON.parse(http.response)
      if ((res.latitude !== 0) && (res.longitude !== 0)) {
        initMap()
        showPrecisePoint()
        base = new google.maps.Marker({ position: { lat: res.latitude, lng: res.longitude }, map: map, icon: baseIcon, title: 'base : {' + res.latitude + ', ' + res.longitude + '}' })
      }
    }
  }
}

window.onload = () => {
  getBase()
}

var roverIconVert = {
  url: 'pointVert.png',
  // origin:  new google.maps.Point(iSize / 2, iSize / 2),
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var roverIconOrange = {
  url: 'pointOrange.png',
  // origin:  new google.maps.Point(iSize / 2, iSize / 2),
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var roverIconJaune = {
  url: 'pointJaune.png',
  // origin:  new google.maps.Point(iSize / 2, iSize / 2),
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var roverIconBleu = {
  url: 'pointBleu.png',
  // origin:  new google.maps.Point(iSize / 2, iSize / 2),
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var roverIconRouge = {
  url: 'pointRouge.png',
  // origin:  new google.maps.Point(iSize / 2, iSize / 2),
  anchor: new google.maps.Point(iSize / 2, iSize / 2),
  scaledSize: new google.maps.Size(iSize, iSize)
}

var baseIcon = {
  url: 'base.png',
  // origin:  new google.maps.Point(size / 2, size / 2),
  anchor: new google.maps.Point(26 / 2, 26 / 2),
  scaledSize: new google.maps.Size(26, 26)
}

var mainIconVert = {
  url: 'cercleVert.png',
  // origin:  new google.maps.Point(size / 2, size / 2),
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}
var mainIconRouge = {
  url: 'cercleRouge.png',
  // origin:  new google.maps.Point(size / 2, size / 2),
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

var mainIconJaune = {
  url: 'cercleJaune.png',
  // origin:  new google.maps.Point(size / 2, size / 2),
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

var mainIconOrange = {
  url: 'cercleOrange.png',
  // origin:  new google.maps.Point(size / 2, size / 2),
  anchor: new google.maps.Point(size / 2, size / 2),
  scaledSize: new google.maps.Size(size, size)
}

const chooseIcon = (url) => {
  switch (url) {
    case 'cercleRouge.png':
      return roverIconRouge
    case 'cercleOrange.png':
      return roverIconOrange
    case 'cercleVert.png':
      return roverIconVert
    case 'cercleJaune.png':
      return roverIconJaune
    default:
      return roverIconRouge
  }
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

const chooseMainIcon = (status) => {
  switch (status) {
    case 'invalid':
      return mainIconRouge
    case '2D/3D':
      return mainIconRouge
    case 'DGNSS':
      return mainIconOrange
    case 'Fixed RTK':
      return mainIconVert
    case 'Float RTK':
      return mainIconJaune
    default:
      return mainIconRouge
  }
}

const showRoverItinerance = () => {
  http.open('GET', ipAddress + '/allRovers', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let rovers = JSON.parse(http.response)
      rovers.forEach((rover) => {
        if (markers[rover._id]) {
          var url = markers[rover._id].icon.url
          var latlng = markers[rover._id].position
          markers[rover._id].setMap(null)
          markers[rover._id] = new google.maps.Marker({ position: { lat: rover.latitude, lng: rover.longitude }, map: map, icon: chooseMainIcon(rover.status), clickable: false })
          allMarkers.push(new google.maps.Marker({ position: latlng, map: map, icon: chooseIcon(url), clickable: false }))
          if (distance(rover.latitude, rover.longitude, latlng.lat, latlng.lng) < 1) {
            console.log('distance: ' + distance(rover.latitude, rover.longitude, latlng.lat, latlng.lng))
          }
        } else {
          markers[rover._id] = new google.maps.Marker({ position: { lat: rover.latitude, lng: rover.longitude }, map: map, icon: chooseRoverIcon(rover.status), clickable: false })
        }
      })
      setTimeout(showRoverItinerance, 1000)
    }
  }
}

const showRover = () => {
  if (markers[0]) {
    map.setCenter(markers[0].marker.position)
  } else {
    console.log('no rover')
  }
}

const showBase = () => {
  if (base) {
    map.setCenter(base.position)
  } else {
    console.log('no base')
  }
}

const showPrecisePoint = () => {
  http.open('GET', ipAddress + '/allRovers', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let rovers = JSON.parse(http.response)
      rovers.forEach((rover, index) => {
        if (markers[index]) {
          if (rover.fixed) {
            if (markers[index].fixed === false) {
              markers[index].fixed = true
              if (markers[index].marker) {
                markers[index].marker.setMap(null)
              }
              markers[index].marker = new google.maps.Marker({
                title: 'position: {' + rover.latitude + ', ' + rover.longitude + '}',
                position: { lat: rover.latitude, lng: rover.longitude },
                icon: chooseMainIcon(rover.status),
                map: map
              })
            }
          } else {
            if (markers[index].fixed === true) {
              markers[index].fixed = false
            }
            if (markers[index].marker) {
              markers[index].marker.setMap(null)
            }
            markers[index].marker = new google.maps.Marker({ position: { lat: rover.latitude, lng: rover.longitude }, map: map, icon: chooseRoverIcon(rover.status), clickable: false })
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
}
