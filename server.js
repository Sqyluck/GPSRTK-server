const net = require('net')
const path = require('path')

const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// respond with 'hello world' when a GET request is made to the homepage
//
//
const {
  logDatetime,
  analyzeData,
  changeBase,
  prepareFrame
} = require('./analyzer/frameAnalyzer.js')

const {
  deleteAllRovers,
  deleteRoverById,
  getallRoversFromDatabase,
  getRoverById
} = require('./database/roverDatabase.js')

const {
  getallBasesFromDatabase,
  setTrueAltitudeById
} = require('./database/baseDatabase.js')

const {
  addRecord,
  getRecord,
  deleteRecord,
  getAllRecords
} = require('./database/recordDatabase.js')

const {
  getFramesFromDatabase
} = require('./database/correctionsDatabase.js')

const server = net.createServer({ allowHalfOpen: false })

const color = require('./color.js')

const { logger } = require('./logger.js')

/**
 * Start server
 */
server.listen(6666, async () => {
  logger.info('----- ' + logDatetime() + ' ----- Server listening at ' + server.address().address + ':' + server.address().port)
  console.log('\x1b[33m', '----- ' + logDatetime() + ' ----- Server listening at ' + server.address().address + ':' + server.address().port)
  console.log(await setTrueAltitudeById(20.21, '5cd00f4d4a65d09a3c81d708'))
})

/**
 * On client connection
 */
server.on('connection', async (socket) => {
  socket.setNoDelay(true)
  var client = {
    connFailed: 0,
    ndat: 0
  }
  var counter = 0
  var msgSize = 0

  const remoteAddress = socket.remoteAddress.toString().split(':')[3] + ':' + socket.remotePort
  console.log('\x1b[33m', 'socket connected from ' + remoteAddress)
  logger.info('[Connexion] Socket connected from ' + remoteAddress)

  var sendData = async (corrections) => {
    var resultArray = ['']
    let nbMsg = 0
    let nbFrame = 0
    let dataSize = 0
    let maxData = 0
    corrections.forEach((msg) => {
      maxData += (msg.data.length / 2)
    })
    corrections.forEach((msg) => {
      if (resultArray[nbMsg].length + msg.data.length < 2000) {
        resultArray[nbMsg] += msg.data
        nbFrame++
        dataSize += msg.data.length / 2
      } else {
        console.log(color.rover, '--> [' + nbFrame + '] send to rover, data[' + dataSize + '/' + maxData + ']')
        resultArray.push(msg.data)
        nbMsg++
        nbFrame = 1
        dataSize += msg.data.length / 2
      }
    })
    resultArray[nbMsg] += '0021fe'
    console.log(color.rover, '--> [' + nbFrame + '] send to rover, data[' + dataSize + '/' + maxData + ']')
    sendPartialData(resultArray, 0)
  }

  var sendPartialData = (array, index) => {
    if (index < array.length) {
      socket.write(prepareFrame(array[index]))
      index++
      setTimeout(sendPartialData, 600, array, index)
    } else {
      return true
    }
  }

  socket.on('data', async (data) => {
    if (client.status) {
      if ((data.toString().slice(8, 14) === '!BASE!') || (data.toString().slice(8, 15) === '!ROVER!')) {
        console.log('!ok not received by client')
        logger.info(' ' + logDatetime() + ' !ok not received by client ' + remoteAddress)
        client.status = null
      }
      if (client.status === 'ROVER') {
        client.msgId = data[0]
        data = data.slice(1)
      }
    }
    const result = await analyzeData(client, data)

    if (result) {
      if (result.nb_try) {
        client.nb_try = result.nb_try
      }

      // Send responses to clients
      if (Array.isArray(result.value)) {
        client.msgId = data[0]
        sendData(result.value)
      } else {
        if (result.value !== '') {
          socket.write(prepareFrame(result.value))
        }
      }

      // Manage server side responses
      if (result.socket) {
        Object.assign(client, result.socket)
        client.connFailed = 0
        if (client.status === 'ROVER') {
          client.nb_try = 0
          client.msgId = 0
          console.log(color.rover, '[' + client.status + '] : [' + logDatetime() + '] : Connected from : ' + remoteAddress)
          logger.info(' ' + logDatetime() + ' [' + client.status + '] : [' + logDatetime() + '] : Connected from : ' + remoteAddress)
        } else {
          client.rest = Buffer.from('')
          console.log(color.base, '[' + client.status + '] : [' + logDatetime() + '] : Connected')
          logger.info(' ' + logDatetime() + ' [' + client.status + '] : [' + logDatetime() + '] : Connected from : ' + remoteAddress)
        }
      } else if (result.value === '!fix') {
        setTimeout(() => {
          client.nb_try = 0
        }, 5000)

        // connexion refused
      } else if (result.value === '!nok') {
        client.connFailed++
        if (client.connFailed > 10) {
          console.log('connexion refused')
          socket.end()
        }
        // data received by base
      } else if (result.value === '!got') {
        if (result.rest) {
          client.rest = result.rest
          if (counter % 100 === 0) {
            logger.info(' ' + logDatetime() + ' [' + client.status + '] : RTCM Received from base [' + data.length + ']')
          }
          counter++
          msgSize += data.length
          console.log(color.base, ' ' + logDatetime() + ' [' + client.status + '] : RTCM Received from base [' + msgSize + ']') // : [' + logDatetime() + ']
          msgSize = 0
        }
      } else if (result.value === '') {
        msgSize += data.length
      } else if (result.value === '!ndat') {
        client.ndat++
        if (client.ndat > 10) {
          client.baseId = await changeBase(client.roverId)
          if (client.baseId) {
            client.ndat = 0
            console.log('base changed: ' + client.baseId)
            logger.info(' ' + logDatetime() + ' [ROVER] New base found for rover ' + socket.remoteAddress)
          } else {
            logger.info(' ' + logDatetime() + ' [ROVER] No base available after 10 empty messages, rover disconnected')
            socket.end()
          }
        }

        // data send to rover
      } else if (Array.isArray(result.value)) {
        if (result.value.length === 0) {
          if (client.ndat > 10) {
            client.baseId = await changeBase(client.roverId)
            if (client.baseId) {
              client.ndat = 0
              console.log('base changed: ' + client.baseId)
            } else {
              // socket.end()
            }
          }
        } else {
          if (client.ndat !== 0) {
            client.ndat = 0
          }
        }
      }
    }
  })

  socket.on('timeout', async () => {
  })

  socket.on('end', () => {
    if (client.status === 'ROVER') {
      // deleteRoverById(client.roverId)
    }
    console.log(client.status === 'ROVER' ? color.rover : color.base, '--------- socket end -----------')
    logger.info('--------- socket end -----------')
  })

  socket.on('close', () => {
    console.log(client.status === 'ROVER' ? color.rover : color.base, '----- ' + logDatetime() + ' ----- Close connection from ' + remoteAddress)
    logger.info('---------' + logDatetime() + ' Connection Closed from ' + remoteAddress + '-----------')
  })

  socket.on('error', (err) => {
    console.log('----- ' + logDatetime() + ' ----- ERROR ' + remoteAddress + ' error: ' + err.message + ' : ' + err.stack + ', (on error)' + ' [' + client.status + ']')
    logger.info('----- ' + logDatetime() + ' ----- ERROR ' + remoteAddress + ' error: ' + err.message + ' : ' + err.stack)
  })
})

server.on('error', (err) => {
  console.log('Server error: ' + err)
})

server.on('close', () => {
  console.log('Server closed')
})

process.on('SIGINT', async () => {
  console.log(color.FgYellow, 'Server closed')
  process.exit()
})

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
  console.log(req.body)
  if (await addRecord(req.body.name, req.body.data)) {
    res.send(true)
  } else {
    res.send(false)
  }
})

app.listen(3000, () => {
  console.log('App listening on port 3000')
})
