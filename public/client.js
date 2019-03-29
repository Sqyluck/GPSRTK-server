const ipAddress = 'http://localhost:3000'
const http = new XMLHttpRequest()

var macarte
const maxLength = 10
const iSize = 50
var roverMarkers = {}

var initMap = () => {
  var latitude = 50.632238
  var longitude = 3.020968
  macarte = L.map('map').setView([latitude, longitude], 20)
  L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    minZoom: 1,
    maxZoom: 25
  }).addTo(macarte)
}


const getBase = () => {
  http.open('GET', ipAddress + '/allBases', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let res = JSON.parse(http.response)
      if ((http.response.latitude !== 0) && (http.response.longitude !== 0)) {
        initMap()
        showRoverItinerance()
        L.marker([res.latitude, res.longitude], { icon: baseIcon }).addTo(macarte)
        // followRoverPosition()
      }
    }
  }
}

window.onload = () => {
  console.log('start')
  getBase()
}

var roverIconVert = L.icon({
  iconUrl: 'pointVert.png',
  iconAnchor: [iSize / 2, iSize / 2],
  iconSize: [iSize, iSize]
})

var roverIconBleu = L.icon({
  iconUrl: 'pointBleu.png',
  iconAnchor: [iSize / 2, iSize / 2],
  iconSize: [iSize, iSize]
})

var roverIconRouge = L.icon({
  iconUrl: 'pointRouge.png',
  iconAnchor: [iSize / 2, iSize / 2],
  iconSize: [iSize, iSize]
  // shadowSize:   [50, 64], // size of the shadow
  // shadowAnchor: [4, 62],  // the same for the shadow
  // popupAnchor:  [-25, -76] // point from which the popup should open relative to the iconAnchor
})

var baseIcon = L.icon({
  iconUrl: 'pointBleu.png',
  iconAnchor: [50, 50],
  iconSize: [100, 100]
})

var mainIconVert = L.icon({
  iconUrl: 'pointVert.png',
  iconAnchor: [50, 50],
  iconSize: [100, 100]
})
var mainIconRouge = L.icon({
  iconUrl: 'pointRouge.png',
  iconAnchor: [50, 50],
  iconSize: [100, 100]
})

const showRoverItinerance = () => {
  http.open('GET', ipAddress + '/allRovers', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let rovers = JSON.parse(http.response)
      rovers.forEach((rover) => {
        if (roverMarkers[rover._id]) {
          var LonLat = roverMarkers[rover._id]._latlng
          macarte.removeLayer(roverMarkers[rover._id])
          if (roverMarkers[rover._id].options.icon.options.iconUrl === 'pointRouge.png') {
            L.marker(LonLat, { icon: roverIconRouge }).addTo(macarte)
          } else {
            L.marker(LonLat, { icon: roverIconVert }).addTo(macarte)
          }
          if (rover.status === 'DGNSS') {
            roverMarkers[rover._id] = L.marker([rover.latitude, rover.longitude], { icon: mainIconVert }).addTo(macarte)
          } else {
            roverMarkers[rover._id] = L.marker([rover.latitude, rover.longitude], { icon: mainIconRouge }).addTo(macarte)
          }
        } else {
          if (rover.status === 'DGNSS') {
            roverMarkers[rover._id] = L.marker([rover.latitude, rover.longitude], { icon: mainIconVert }).addTo(macarte)
          } else {
            roverMarkers[rover._id] = L.marker([rover.latitude, rover.longitude], { icon: mainIconRouge }).addTo(macarte)
          }
        }
      })
      setTimeout(showRoverItinerance, 1000)
    }
  }
}

const followRoverPosition = () => {
  http.open('GET', ipAddress + '/allRovers', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let rovers = JSON.parse(http.response)
      rovers.forEach((rover) => {
        if (roverMarkers[rover._id]) {
          roverMarkers[rover._id].moveTo([rover.latitude, rover.longitude])
        } else {
          roverMarkers[rover._id] = L.marker([rover.latitude, rover.longitude], { icon: roverIconVert }).addTo(macarte)
        }
      })
      setTimeout(followRoverPosition, 1000)
    }
  }
}

const showRoverPosition = () => {
  http.open('GET', ipAddress + '/allRovers', true)
  http.send()
  http.onload = () => {
    if (http.status === 200) {
      let rovers = JSON.parse(http.response)
      rovers.forEach((rover) => {
        if (roverMarkers[rover._id]) {
          if (roverMarkers[rover._id].length > maxLength) {
            let killMarker = roverMarkers[rover._id].shift()
            macarte.removeLayer(killMarker)
          }
          if (rover.status === 'DGNSS') {
            roverMarkers[rover._id].push(L.marker([rover.latitude, rover.longitude], { icon: roverIconVert }).addTo(macarte))
          } else {
            roverMarkers[rover._id].push(L.marker([rover.latitude, rover.longitude], { icon: roverIconRouge }).addTo(macarte))
          }
        } else {
          roverMarkers[rover._id] = []
          if (rover.status === 'DGNSS') {
            roverMarkers[rover._id].push(L.marker([rover.latitude, rover.longitude], { icon: roverIconVert }).addTo(macarte))
          } else {
            roverMarkers[rover._id].push(L.marker([rover.latitude, rover.longitude], { icon: roverIconRouge }).addTo(macarte))
          }
        }
      })
      setTimeout(showRoverPosition, 1000)
    }
  }
}
