const { updateRoverPositionById } = require('./../database/roverDatabase.js')
const { addPostionToRecord } = require('./../database/recordDatabase.js')
const { getFramesFromDatabase } = require('./../database/correctionsDatabase.js')
const { getRelativeAltitudeByBaseId } = require('./../database/baseDatabase.js')
const {
  getLonLatInDec,
  getStringStatus,
  logDatetime,
  macAddrToString
} = require('./tools.js')

const color = require('./../color.js')

const { logger } = require('./../logger.js')

const getPositionAndStatus = async (data) => {
  if (NMEACrc(data)) {
    const positionData = data.toString().split(',')
    return {
      latitude: positionData[2],
      longitude: positionData[4],
      status: getStringStatus(positionData[6]),
      altitude: Number(positionData[9]),
      result: (positionData[2] !== '') && (positionData[4] !== '') && (positionData[2] != null) && (positionData[4] != null) && (positionData[6] != null)
    }
  } else {
    console.log('crc failed')
    return {
      result: false,
      status: ''
    }
  }
}

const analyzeRoverRequest = async (data, baseId, roverId, nbTry, recordId, macAddr) => {
  const result = await getPositionAndStatus(data)
  console.log(color.rover, '[ROVER ' + macAddrToString(macAddr) + '] Status: ' + result.status)
  let threshold = 10
  if (result.result) {
    let altitude = await getRelativeAltitudeByBaseId(result.altitude, baseId)
    let latitude = getLonLatInDec(result.latitude)
    let longitude = getLonLatInDec(result.longitude)
    if ((nbTry === threshold) || (result.status === 'Fixed RTK')) {
      await updateRoverPositionById(latitude, longitude, altitude, result.status, roverId, true)
      if (result.status === 'Fixed RTK') {
        if (recordId) {
          await addPostionToRecord(latitude, longitude, altitude, recordId)
        }
        console.log(color.rover, '[ROVER ' + macAddrToString(macAddr) + '] Fix point found: ' + '{' + result.status + '}')
        logger.info(logDatetime() + ' [ROVER ' + macAddrToString(macAddr) + '] Fix point found: ' + '{' + result.status + '}')
        return {
          value: '!fix',
          nb_try: threshold + 1
        }
      } else {
        console.log(color.rover, '[ROVER ' + macAddrToString(macAddr) + ']: Can\'t find fix point {' + result.status + '}')
        logger.info(logDatetime() + ' [ROVER ' + macAddrToString(macAddr) + '] Can\'t find fix point {' + result.status + '}')
        return {
          value: '!nfix',
          nb_try: threshold + 1
        }
      }
    } else if (nbTry < threshold) {
      await updateRoverPositionById(latitude, longitude, altitude, result.status, roverId, false)
      const rtcmPacket = await getFramesFromDatabase(baseId)
      if (rtcmPacket.length === 0) {
        return {
          value: '!ndat',
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
    // console.log(color.rover, '[ROVER] data received: ' + data.toString())
    logger.error('rover failed: ' + JSON.stringify(result))
    return {
      value: '!ndat'
    }
  }
}

const NMEACrc = (nmea) => {
  let crc = 0
  for (let i = 1; i < nmea.length - 5; i++) {
    crc ^= nmea[i]
  }
  return crc.toString(16).toUpperCase() === nmea.toString().slice(nmea.length - 4, nmea.length - 2)
}

exports.analyzeRoverRequest = analyzeRoverRequest
