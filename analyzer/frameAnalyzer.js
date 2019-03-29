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
  updateRoverPositionById
} = require('./../database/roverDatabase.js')

const {
  analyzeAndGetData,
  getStringStatus
} = require('./roverAnalyzer.js')

// const color = require('./../color.js')

const { analyzeAndSaveData } = require('./baseAnalyzer.js')

const analyzeData = async (client, data) => {
  // if connected as a base
  if (client.status === 'BASE') {
    const res = await base(client.rest, data, client.baseId)
    return res

  // if connected as a rover
  } else if (client.status === 'ROVER') {
    const res = await rover(data, client.baseId, client.roverId)
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
  if (res.result) {
    return {
      value: '!got',
      rest: res.rest
    }
  } else {
    return false
  }
}

const rover = async (data, baseId, roverId) => {
  const result = await analyzeAndGetData(data)
  if (result.result) {
    await updateRoverPositionById(getLonLatInDec(result.latitude), getLonLatInDec(result.longitude), result.status, roverId)
    const rtcmPacket = await getFramesFromDatabase(baseId)
    return {
      value: rtcmPacket
    }
  } else {
    console.log('rover failed')
    return false
  }
}

const getLonLatInDec = (value) => {
  return Math.floor(Number(value) / 100) + (Number(value) % 100) / 60
}

const checkConnectionFrame = async (frame) => {
  const connectionData = frame.toString().split('!')
  const positionData = connectionData[2].split(',')
  const status = positionData[6]
  const latitude = getLonLatInDec(positionData[2])
  const longitude = getLonLatInDec(positionData[4])
  const result = {
    status: connectionData[1],
    connected: ((((connectionData[1] === 'BASE') || (connectionData[1] === 'ROVER')) && (status !== 0)) || connectionData[1] === 'ADMIN')
  }
  if (!result.connected) {
    return result
  } else if (connectionData[1] === 'BASE') {
    result.baseId = await addBaseToDatabase(latitude, longitude)
    return result
  } else if (connectionData[1] === 'ROVER') {
    result.baseId = await getClosestBase(latitude, longitude)
    result.roverId = await addRoverToDatabase(latitude, longitude, getStringStatus(status))
    return result
  } else if (connectionData[1] === 'ADMIN') {
    return result
  }
}

const logDatetime = () => {
  return new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
}

const deleteBase = async (id) => {
  await deleteCorrectionsbyBaseId(id)
  await deleteBaseFromDatabase(id)
}

exports.analyzeAndSaveData = analyzeAndSaveData
exports.checkConnectionFrame = checkConnectionFrame
exports.logDatetime = logDatetime
exports.deleteBase = deleteBase
exports.analyzeData = analyzeData
