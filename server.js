const net = require('net')
const path = require('path')

const express = require('express')
const app = express()

// respond with 'hello world' when a GET request is made to the homepage
const {
  logDatetime,
  analyzeData,
  changeBase
} = require('./analyzer/frameAnalyzer.js')

const {
  deleteAllRovers,
  deleteRoverById,
  getallRoversFromDatabase
} = require('./database/roverDatabase.js')

const {
  getallBasesFromDatabase
} = require('./database/baseDatabase.js')

const server = net.createServer({ allowHalfOpen: false })

const color = require('./color.js')
/**
 * Start server
 */

server.listen(6666, '192.168.1.106', () => {
  console.log('\x1b[33m', '----- ' + logDatetime() + ' ----- Server listening at ' + server.address().address + ':' + server.address().port)
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
  var stillAlive = null

  const startTimer = () => {
    stillAlive = setTimeout(() => {
      if (client.status === 'ROVER') {
        console.log(color.rover, '(!)[' + client.status + '] : Disconnected from server')
        deleteRoverById(client.roverId)
      } else {
        console.log(color.base, '(!)[' + client.status + '] : Disconnected from server')
      }
      client = {}
      socket.end()
    }, 300000)
  }

  const stopTimer = () => {
    clearTimeout(stillAlive)
  }

  const remoteAddress = socket.remoteAddress + ':' + socket.remotePort
  console.log('\x1b[33m', 'socket connected from ' + remoteAddress)

  var sendData = (array, index) => {
    if (index < array.length) {
      var buffer = Buffer.from(array[index].data, 'hex')
      var length = buffer[1] * 256 + buffer[2] + 6
      if (length !== buffer.length) {
        console.log('[ERROR] message incomplet')
      }
      // console.log(color.rover, '--> [' + array[index].type + ': length: ' + buffer.length + ']')
      socket.write(buffer)
      index++
      setTimeout(sendData, 100, array, index)
    } else {
      return true
    }
  }

  socket.on('data', async (data) => {
    const result = await analyzeData(client, data)

    if (result) {
      if (result.nb_try) {
        client.nb_try = result.nb_try
      }

      // Keep alive
      if (client.status) {
        stopTimer()
        startTimer()
      }

      // Send responses to clients
      if (Array.isArray(result.value)) {
        if (result.value.length === 0) {
          socket.write(Buffer.from('!ndat'))
        } else {
          console.log(color.rover, '--> [' + result.value.length + '] Rtcm Send')
          sendData(result.value, 0)
        }
      } else {
        const buffer = Buffer.from(result.value)
        socket.write(buffer)
      }
      // MSanage server side responses
      if (result.socket) {
        Object.assign(client, result.socket)
        client.connFailed = 0
        if (client.status === 'ROVER') {
          client.nb_try = 0
          console.log(color.rover, '[' + client.status + '] : [' + logDatetime() + '] : Connected')
        } else {
          client.rest = Buffer.from('')
          console.log(color.base, '[' + client.status + '] : [' + logDatetime() + '] : Connected')
        }
      } else if (result.value === '!fix') {
        setTimeout(() => {
          client.nb_try = 0
        }, 10000)

        // connexion refused
      } else if (result.value === '!nok') {
        client.connFailed++
        if (client.connFailed > 10) {
          console.log('connexion refused')
          socket.end()
        }
        // data received by base
      } else if (result.value === '!got') {
        client.rest = result.rest
        console.log(color.base, '[' + client.status + '] : RTCM Received from base') // : [' + logDatetime() + ']

        // data send to rover
      } else if (Array.isArray(result.value)) {
        if (result.value.length === 0) {
          client.ndat++
          console.log('no data: ' + client.ndat)
          if (client.ndat > 10) {
            client.baseId = await changeBase(client.roverId)
            if (client.baseId) {
              client.ndat = 0
              console.log('base changed: ' + client.baseId)
            } else {
              socket.end()
            }
          }
        } else {
          if (client.ndat !== 0) {
            client.ndat = 0
          }
        }
        // console.log(color.rover, '[' + client.status + '] : RTCM Send to rover') // : [' + logDatetime() + ']
      }
    }
  })

  socket.on('timeout', async () => {
  })

  socket.on('end', () => {
    if (client.status === 'ROVER') {
      deleteRoverById(client.roverId)
    }
    console.log(client.status === 'ROVER' ? color.rover : color.base, '--------- socket end -----------')
  })

  socket.on('close', () => {
    console.log(client.status === 'ROVER' ? color.rover : color.base, '----- ' + logDatetime() + ' ----- Close connection from ' + remoteAddress)
  })

  socket.on('error', (err) => {
    console.log(client.status === 'ROVER' ? color.rover : color.base, '----- ' + logDatetime() + ' ----- Connection ' + remoteAddress + ' error: ' + err.message + ', (on error)' + ' [' + client.status + ']')
  })
})

server.on('close', () => {
  console.log('Server closed')
})

process.on('SIGINT', async () => {
  if (await deleteAllRovers()) {
    console.log(color.FgYellow, 'Server closed')
    process.exit()
  }
})

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'))
})

app.get('/allBases', async (req, res) => {
  var bases = await getallBasesFromDatabase()
  res.json(bases[0])
})

app.get('/allRovers', async (req, res) => {
  var rovers = await getallRoversFromDatabase()
  res.json(rovers)
})

app.listen(3000, () => {
  console.log('App listening on port 3000')
})
