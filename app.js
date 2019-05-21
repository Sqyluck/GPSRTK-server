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
  getBaseById
} = require('./database/baseDatabase.js')

const {
  addRecord,
  getRecord,
  deleteRecord,
  getAllRecords,
  createCsvFileByRecordId
} = require('./database/recordDatabase.js')

const {
  coordToLambert
} = require('./analyzer/tools.js')

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
  res.json(bases)
})

app.get('/allRovers', async (req, res) => {
  var rovers = await getallRoversFromDatabase()
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
  record.macAddr = base.macAddr
  record.trueAltitude = base.trueAltitude
  record.data.forEach((pos) => {
    let lambert = coordToLambert('Lambert93', pos.lat, pos.lng)
    pos.X = lambert.X
    pos.Y = lambert.Y
  })
  res.send(record)
})

app.listen(3000, () => {
  console.log('App listening on port 3000')
})

exports.app = app
