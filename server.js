const net = require('net')
const app = require('./app.js')

const {
  analyzeData,
  changeBase
} = require('./analyzer/frameAnalyzer.js')

const {
  logDatetime,
  prepareFrame,
  prepareRTCMArray
} = require('./analyzer/tools.js')

const server = net.createServer({ allowHalfOpen: false })

const color = require('./color.js')

const { logger } = require('./logger.js')

/**
 * Start server
 */
server.listen(6666, async () => {
  logger.info('----- ' + logDatetime() + ' ----- Server listening at ' + server.address().address + ':' + server.address().port)
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
  var counter = 0
  var msgSize = 0

  const remoteAddress = socket.remoteAddress.toString().split(':')[3] + ':' + socket.remotePort
  console.log('\x1b[33m', 'socket connected from ' + remoteAddress)
  logger.info('[Connexion] Socket connected from ' + remoteAddress)

  var sendPartialData = (array, index) => {
    if (index < array.length) {
      socket.write(prepareFrame(array[index]))
      console.log(color.rover, ' --> [' + (index + 1) + '/' + array.length + '] Send RTCM (' + (array[index].length / 2) + ')')
      index++
      setTimeout(sendPartialData, 600, array, index)
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
      if (result.recordId !== undefined) {
        client.recordId = result.recordId
      }

      // Send responses to clients
      if (Array.isArray(result.value)) {
        if (client.ndat !== 0) {
          client.ndat = 0
        }
        sendPartialData(prepareRTCMArray(result.value), 0)
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
          client.recordId = null
          console.log(color.rover, '[' + client.status + '] : [' + logDatetime() + '] : Connected from : ' + remoteAddress)
          logger.info(' ' + logDatetime() + ' [' + client.status + '] : [' + logDatetime() + '] : Connected from : ' + remoteAddress)
        } else {
          client.rest = Buffer.from('')
          console.log(color.base, '[' + client.status + '] : [' + logDatetime() + '] : Connected')
          logger.info(' ' + logDatetime() + ' [' + client.status + '] : [' + logDatetime() + '] : Connected from : ' + remoteAddress)
        }
      } else if ((result.value === '!fix') || (result.value === '!nfix')) {
        setTimeout(() => {
          client.nb_try = 0
        }, 0)

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
