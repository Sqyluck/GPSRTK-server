const {
  getFramesFromDatabase,
  deleteCorrectionsbyBaseId
} = require('./../database/correctionsDatabase.js')

const {
  addBaseToDatabase,
  deleteBaseFromDatabase,
  getClosestBase
} = require('./../database/baseDatabase.js')

const {
  addRoverToDatabase,
  updateRoverPositionById,
  getRoverFromDatabase
} = require('./../database/roverDatabase.js')

const {
  analyzeAndGetData,
  getStringStatus
} = require('./roverAnalyzer.js')

const color = require('./../color.js')

const { logger } = require('./../logger.js')

// const color = require('./../color.js')

const { analyzeAndSaveData } = require('./baseAnalyzer.js')

const analyzeData = async (client, data) => {
  // if connected as a base
  if (client.status === 'BASE') {
    const res = await base(client.rest, data, client.baseId)
    return res

  // if connected as a rover
  } else if (client.status === 'ROVER') {
    const res = await rover(data, client.baseId, client.roverId, client.nb_try, client.msgId)
    return res

  // if not connected
  } else if (!client.status) {
    const socketValue = await checkConnectionFrame(data)
    if ((socketValue.connected) && (socketValue.baseId != null)) {
      return {
        socket: socketValue,
        value: '!ok'
      }
    } else {
      return {
        value: '!nok'
      }
    }
  }
}

const base = async (rest, data, id) => {
  const res = await analyzeAndSaveData(rest, data, id)
  if (res.result !== 0) {
    if (res.result === -1) {
      return {
        value: '!got'
      }
    } else {
      console.log(color.base, '<-- [' + res.result + '] Rtcm Received ' + (res.response ? '(end)' : '(+)'))
      // logger.info('[BASE] <-- [' + res.result + '] Rtcm Received')
      if (res.response) {
        return {
          value: '!got',
          rest: res.rest
        }
      } else {
        return {
          value: '',
          rest: res.rest
        }
      }
    }
  } else {
    return false
  }
}

const rover = async (data, baseId, roverId, nbTry, msgId) => {
  const result = await analyzeAndGetData(data)
  console.log(color.rover, '[ROVER] [' + msgId + '] Status: ' + result.status)
  let threshold = 10
  if (result.result) {
    // if ((result.status === 'Fixed RTK') || (nbTry === threshold)) {
    if (nbTry === threshold) {
      await updateRoverPositionById(getLonLatInDec(result.latitude), getLonLatInDec(result.longitude), result.status, roverId, true)
      console.log(color.rover, '[ROVER]: Fix point found: ' + '{' + result.status + '}')
      logger.info('[ROVER]: Fix point found: ' + '{' + result.status + '}')
      return {
        value: '!fix',
        nb_try: threshold + 1
      }
    } else if (nbTry < threshold) {
      await updateRoverPositionById(getLonLatInDec(result.latitude), getLonLatInDec(result.longitude), result.status, roverId, false)
      const rtcmPacket = await getFramesFromDatabase(baseId)
      // console.log(color.rover, '[ROVER]: RTCM send, status: {' + result.status + '}')
      // logger.info('[ROVER]: RTCM send, status: {' + result.status + '}')
      if (rtcmPacket.length === 0) {
        return {
          value: rtcmPacket,
          nb_try: nbTry
        }
      } else {
        return {
          value: rtcmPacket,
          nb_try: ++nbTry
        }
      }
    } else {
      console.log(color.rover, 'rover +1: ' + nbTry)
      logger.error('rover +1: ' + nbTry)
    }
  } else {
    // console.log(color.rover, 'rover failed: ' + JSON.stringify(result))
    console.log(color.rover, '[ROVER] data received: ' + data.toString())
    logger.error('rover failed: ' + JSON.stringify(result))
    return {
      value: []
    }
  }
}

const getLonLatInDec = (value) => {
  return Math.round((Math.floor(Number(value) / 100) + (Number(value) % 100) / 60) * 10000000) / 10000000
}

const checkConnectionFrame = async (frame) => {
  if (frame != null) {
    var macAddr = new Uint8Array(8)
    for (var i = 0; i < 8; i++) {
      macAddr[i] = frame[i]
    }
    const connectionData = frame.toString().split('!')
    const positionData = connectionData[2].split(',')
    const status = positionData[6]
    const latitude = getLonLatInDec(positionData[2])
    const longitude = getLonLatInDec(positionData[4])
    console.log('{latitude: ' + latitude + ', longitude: ' + longitude + '}')
    const result = {
      status: connectionData[1],
      connected: (((connectionData[1] === 'BASE') || (connectionData[1] === 'ROVER')) && (Number(status) !== 0))
    }
    if (!result.connected) {
      return result
    } else if (connectionData[1] === 'BASE') {
      result.baseId = await addBaseToDatabase(latitude, longitude, macAddr)
      return result
    } else if (connectionData[1] === 'ROVER') {
      result.baseId = await getClosestBase(latitude, longitude)
      if (result.baseId) {
        result.roverId = await addRoverToDatabase(latitude, longitude, getStringStatus(status), macAddr)
      }
      return result
    }
  }
}

const logDatetime = () => {
  return new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
}

const deleteBase = async (id) => {
  await deleteCorrectionsbyBaseId(id)
  await deleteBaseFromDatabase(id)
}

const changeBase = async (roverId) => {
  try {
    var rover = await getRoverFromDatabase(roverId)
    var baseId = await getClosestBase(rover.latitude, rover.longitude)
    return baseId
  } catch (err) {
    console.log('changeBase: ' + err)
  }
}

const prepareFrame = (frame, type) => {
  let size = null
  let str = ''
  if (frame[0] === '!') {
    // console.log(frame)
    // console.log(Buffer.from(frame))
    // console.log(Buffer.from(frame.slice(1)).toString('hex'))
    size = new Uint8Array([frame.length << 8, frame.length])
    str = size[0].toString(16).padStart(2, '0') + size[1].toString(16).padStart(2, '0') + '21' + Buffer.from(frame.slice(1)).toString('hex')
  } else {
    // console.log((frame.length / 2) + 1)
    size = new Uint8Array([((frame.length / 2) + 1) >> 8, (frame.length / 2) + 1])
    // console.log(size)
    str = size[0].toString(16).padStart(2, '0') + size[1].toString(16).padStart(2, '0') + '21' + frame
  }
  // console.log(str)
  return Buffer.from(str, 'hex')
}

exports.analyzeAndSaveData = analyzeAndSaveData
exports.checkConnectionFrame = checkConnectionFrame
exports.logDatetime = logDatetime
exports.deleteBase = deleteBase
exports.analyzeData = analyzeData
exports.changeBase = changeBase
exports.getLonLatInDec = getLonLatInDec
exports.prepareFrame = prepareFrame
