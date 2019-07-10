const {
  addBaseToDatabase,
  getClosestBase,
  getRelativeAltitudeByBaseId
} = require('./../database/baseDatabase.js')

const {
  analyzeBaseInfo,
  analyzeBaseData
} = require('./baseAnalyzer.js')

const {
  addRoverToDatabase,
  getRoverById,
  updateSatellitesByRoverId
} = require('./../database/roverDatabase.js')

const { analyzeRoverRequest } = require('./roverAnalyzer.js')

const {
  createRecord,
  deleteEmptyRecords
} = require('./../database/recordDatabase.js')

const {
  getLonLatInDec,
  getStringStatus,
  getFlagsStatus,
  toSignedInt,
  gnssIdToString
} = require('./tools.js')

const color = require('./../color.js')

const analyzeData = async (client, data) => {
  if (data[0] === 0x21) {
    let header = data.toString().split('!')[1]
    switch (header) {
      case 'CONN':
        client.status = null
        data = data.slice(6)
        break
      case 'START':
        console.log(color.FgMagenta, '---------- start record -----------')
        let recordId = await createRecord(client.roverId, client.baseId)
        return {
          recordId: recordId,
          value: '!start'
        }
      case 'END':
        console.log(color.FgMagenta, '---------- end record -----------')
        client.recordId = null
        await deleteEmptyRecords()
        return {
          recordId: null,
          value: '!end'
        }
      case 'SVINACC':
        data = data.slice(9)
        const res = await analyzeBaseInfo(data, client.baseId, client.macAddr)
        return res
      case 'SAT':
        console.log(data.toString('hex'))
        data = data.slice(5)
        getSatellitesInformations(data, client.roverId)
        return
    }
  }

  // if connected as a base
  if (client.status === 'BASE') {
    const res = await analyzeBaseData(client.rest, data, client.baseId)
    return res

  // if connected as a rover
  } else if (client.status === 'ROVER') {
    const res = await analyzeRoverRequest(data, client.baseId, client.roverId, client.nb_try, client.recordId, client.macAddr)
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

const getSatellitesInformations = (data, roverId) => {
  data = data.slice(6)
  const nSvs = data[5]
  const satellites = []
  console.log('Number of satellites: ' + nSvs)
  for (let i = 0; i < nSvs; i++) {
    let gnssId = data[8 + 12 * i]
    let svId = data[9 + 12 * i]
    let el = toSignedInt(data[11 + 12 * i])
    let az = data[13 + 12 * i] << 8 | data[12 + 12 * i]
    let flags = getFlagsStatus(data.slice(16 + 12 * i, 20 + 12 * i))
    satellites.push({
      Id: gnssIdToString(gnssId) + svId,
      el,
      az,
      quality: flags.qualityInd,
      svUsed: flags.svUsed,
      health: flags.health,
      GNSS: flags.diffCorr,
      RTCM: flags.rtcm
    })
  }
  updateSatellitesByRoverId(roverId, satellites)
  console.table(satellites)
}

const checkConnectionFrame = async (frame) => {
  if (frame != null) {
    var macAddr = new Uint8Array(8)
    for (var i = 0; i < 8; i++) {
      macAddr[i] = frame[i]
      frame[i] = 0x00
    }
    const connectionData = frame.toString().split('!')
    const positionData = connectionData[2].split(',')
    const status = positionData[6]
    const latitude = getLonLatInDec(positionData[2])
    const longitude = getLonLatInDec(positionData[4])

    const altitude = Number(positionData[9])
    const height = Number(positionData[11])
    const result = {
      status: connectionData[1] === 'ROVER' ? 'ROVER' : 'BASE',
      macAddr: macAddr,
      connected: (((connectionData[1].slice(0, 4) === 'BASE') || (connectionData[1] === 'ROVER')) && (Number(status) !== 0))
    }
    if (!result.connected) {
      return result
    } else if (connectionData[1].slice(0, 4) === 'BASE') {
      const accuracy = Number(connectionData[1].slice(4))
      result.baseId = await addBaseToDatabase(latitude, longitude, altitude, height, macAddr, accuracy)
      return result
    } else if (connectionData[1] === 'ROVER') {
      result.baseId = await getClosestBase(latitude, longitude)
      if (result.baseId) {
        let relAltitude = await getRelativeAltitudeByBaseId(altitude, result.baseId)
        result.roverId = await addRoverToDatabase(latitude, longitude, relAltitude, getStringStatus(status), macAddr)
      }
      return result
    }
  }
}

const changeBase = async (roverId) => {
  try {
    var rover = await getRoverById(roverId)
    var baseId = await getClosestBase(rover.latitude, rover.longitude)
    return baseId
  } catch (err) {
    console.log('changeBase: ' + err)
  }
}

exports.checkConnectionFrame = checkConnectionFrame
exports.analyzeData = analyzeData
exports.changeBase = changeBase
exports.getLonLatInDec = getLonLatInDec
