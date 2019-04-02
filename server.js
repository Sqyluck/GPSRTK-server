const net = require('net')
const path = require('path')

const express = require('express')
const app = express()

// respond with 'hello world' when a GET request is made to the homepage
const {
  logDatetime,
  analyzeData
} = require('./analyzer/frameAnalyzer.js')

const {
  deleteAllRovers,
  deleteRoverById,
  getallRoversFromDatabase
} = require('./database/roverDatabase.js')

const {
  getallBasesFromDatabase
} = require('./database/baseDatabase.js')

const server = net.createServer()

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
  var client = {}
  var counter = 0
  var stillAlive = null

  const startTimer = () => {
    stillAlive = setTimeout(() => {
      if (client.status === 'ROVER') {
        console.log(color.rover, '(!)[' + client.status + '] : Disconnected from server')
        deleteRoverById(client.roverId)
      } else {
        console.log(color.base, '(!)[' + client.status + '] : Disconnected from server')
      }
      console.log('socket.end()')
      socket.end()
    }, 30000)
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
      setTimeout(sendData, 30, array, index)
    } else {
      return true
    }
  }

  socket.on('data', async (data) => {
    const result = await analyzeData(client, data)
    if (client.status) {
      stopTimer()
      startTimer()
      if (client.received === false) {
        client.received = true
      }
    }
    if (result.value === '!got') {
      client.rest = result.rest
      console.log(color.base, '[' + client.status + '] : RTCM Received from base') // : [' + logDatetime() + ']
    } else if (Array.isArray(result.value)) {
      console.log(color.rover, '[' + client.status + '] : RTCM Send to rover [' + (counter++ % 100) + ']') // : [' + logDatetime() + ']
    }
    if (Array.isArray(result.value)) {
      if (result.value.length === 0) {
        socket.write(Buffer.from('!ndat'))
      } else {
        console.log('--> SEND RTCM [' + result.value.length + ']')
        sendData(result.value, 0)
      }
    } else {
      const buffer = Buffer.from(result.value)
      socket.write(buffer)
      if (result.socket) {
        Object.assign(client, result.socket)
        if (client.status === 'ROVER') {
          console.log(color.rover, '[' + client.status + '] : [' + logDatetime() + '] : Connected')
        } else {
          client.rest = Buffer.from('')
          console.log(color.base, '[' + client.status + '] : [' + logDatetime() + '] : Connected')
        }
      }
    }
  })

  socket.on('timeout', async () => {
  })

  socket.on('end', () => {
    console.log('socket end')
  })

  socket.on('close', () => {
    console.log('socket disconnected')
    console.log('----- ' + logDatetime() + ' ----- Close connection from ' + remoteAddress + ' (on close)' + ' [' + client.status + ']')
  })

  socket.on('error', (err) => {
    console.log('----- ' + logDatetime() + ' ----- Connection ' + remoteAddress + ' error: ' + err.message + ', (on error)' + ' [' + client.status + ']')
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
