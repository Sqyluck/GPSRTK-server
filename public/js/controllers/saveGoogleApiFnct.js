const size = 10
var roverMap = null

var addMarker = (lat, lng, status) => {
  return (new google.maps.Marker({
    position: { lat: lat, lng: lng },
    map: roverMap,
    icon: chooseRoverIcon(status)
  }))
}


var initMap = (lat, lng) => {
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
}

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
