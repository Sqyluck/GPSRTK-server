const express = require('express')
const bodyParser = require('body-parser')

const path = require('path')

const app = express()

const {
  getallRoversFromDatabase,
  getRoverById
} = require('./database/roverDatabase.js')

const {
  getallBasesFromDatabase,
  setTrueAltitudeById,
  getBaseById,
  getBaseMacAddress,
  setNewAccuracyOnBase
} = require('./database/baseDatabase.js')

const {
  addRecord,
  getRecord,
  deleteRecord,
  getAllRecords,
  createCsvFileByRecordId
} = require('./database/recordDatabase.js')

const {
  asyncForEach
} = require('./database/database.js')

const {
  coordToLambert,
  prepareFrame,
  macAddrToString
} = require('./analyzer/tools.js')

const sockets = new Map()

const addSocket = (id, socket) => {
  sockets.set(id, socket)
}

const delSocket = (id) => {
  sockets.delete(id)
}

/*
    WebApp
 */

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  next()
})

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())
app.use(express.json())

app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'))
})

app.get('/allBases', async (req, res) => {
  var bases = await getallBasesFromDatabase()
  bases.forEach((base, i) => {
    bases[i].macAddr = macAddrToString(base.macAddr)
    bases[i].connected = sockets.has(base._id.toString())
  })
  res.json(bases)
})

app.get('/allRovers', async (req, res) => {
  var rovers = await getallRoversFromDatabase()
  rovers.forEach((rover, index) => {
    rovers[index].macAddr = macAddrToString(rover.macAddr)
  })
  res.json(rovers)
})

app.get('/deleteRecord/:recordId', async (req, res) => {
  if (await deleteRecord(req.params.recordId)) {
    res.send(true)
  } else {
    res.send(false)
  }
})

app.get('/getRover/:roverId', async (req, res) => {
  const rover = await getRoverById(req.params.roverId)
  res.json(rover)
})

app.get('/allRecords', async (req, res) => {
  var records = await getAllRecords()
  await asyncForEach(records, async (record, index) => {
    const rover = await getRoverById(record.roverId)
    records[index].roverMacAddr = macAddrToString(rover.macAddr)
    records[index].dataLen = records[index].data.length
    delete records[index].baseId
    delete records[index].data
  })
  res.json(records)
})

app.post('/saveRecord', async (req, res) => {
  if (await addRecord(req.body.name, req.body.data)) {
    res.send(true)
  } else {
    res.send(false)
  }
})

app.get('/setAltitude/:baseId/:newAltitude', async (req, res) => {
  await setTrueAltitudeById(req.params.baseId, Number(req.params.newAltitude))
  res.send(true)
})

app.get('/download/:recordId/:mode', async (req, res) => {
  await createCsvFileByRecordId(req.params.recordId, req.params.mode)
  res.download(path.join(__dirname, '/public/data.' + req.params.mode), (req.params.recordId + '.' + req.params.mode), (err) => {
    if (err) {
      console.log('download failed: ' + err)
    }
  })
})

app.get('/load/:recordId', async (req, res) => {
  const record = await getRecord(req.params.recordId)
  const base = await getBaseById(record.baseId)
  record.altitude = base.altitude
  record.macAddr = macAddrToString(base.macAddr)
  record.trueAltitude = base.trueAltitude
  record.data.forEach((pos) => {
    let lambert = coordToLambert('Lambert93', pos.lat, pos.lng)
    pos.X = lambert.X
    pos.Y = lambert.Y
  })
  res.send(record)
})

app.get('/allSockets', async (req, res) => {
  var currentSocket = []
  sockets.forEach((value, key) => {
    currentSocket.push({ key })
  })
  await asyncForEach(currentSocket, async (socket, index) => {
    const macAddr = await getBaseMacAddress(socket.key)
    socket.macAddr = macAddrToString(macAddr)
  })
  res.json(currentSocket)
})

app.get('/changeAcc/:baseId/:newAcc', async (req, res) => {
  const socket = sockets.get(req.params.baseId)
  const msg = '!newAcc!' + req.params.newAcc
  await setNewAccuracyOnBase(req.params.baseId, Number(req.params.newAcc))
  socket.pause()
  setTimeout(() => {
    socket.write(prepareFrame(msg))
    socket.resume()
  }, 2000)
  res.sendStatus(200)
})

app.listen(3000, () => {
  console.log('App listening on port 3000')
})

exports.app = app
exports.addSocket = addSocket
exports.delSocket = delSocket
