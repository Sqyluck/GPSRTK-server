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
  setRoverFixed
} = require('./../database/roverDatabase.js')

const {
  analyzeAndGetData,
  getStringStatus
} = require('./roverAnalyzer.js')

const color = require('./../color.js')

// const color = require('./../color.js')

const { analyzeAndSaveData } = require('./baseAnalyzer.js')

const analyzeData = async (client, data) => {
  // if connected as a base
  if (client.status === 'BASE') {
    const res = await base(client.rest, data, client.baseId)
    return res

  // if connected as a rover
  } else if (client.status === 'ROVER') {
    const res = await rover(data, client.baseId, client.roverId, client.nb_try)
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

const rover = async (data, baseId, roverId, nbTry) => {
  const result = await analyzeAndGetData(data)
  // console.log(color.rover, '[ROVER] Status: ' + result.status)
  if (result.result) {
    if ((result.status === 'DGNSS') || (nbTry === 10)) {
      await updateRoverPositionById(getLonLatInDec(result.latitude), getLonLatInDec(result.longitude), result.status, roverId, true)
      nbTry += 11
      return {
        value: '!fix'
      }
    } else if (nbTry < 10) {
      await updateRoverPositionById(getLonLatInDec(result.latitude), getLonLatInDec(result.longitude), result.status, roverId, false)
      const rtcmPacket = await getFramesFromDatabase(baseId)
      if (rtcmPacket.length === 0) {
        return {
          value: rtcmPacket
        }
      } else {
        return {
          value: rtcmPacket
        }
      }
    }
  } else {
    console.log('rover failed: ' + JSON.stringify(result))
    return {
      value: '!ndat'
    }
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
    connected: (((connectionData[1] === 'BASE') || (connectionData[1] === 'ROVER')) && (Number(status) !== 0))
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
