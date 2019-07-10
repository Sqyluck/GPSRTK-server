const color = require('./../color.js')
const config = require('./config')
const { logger } = require('./../logger.js')
const {
  getLonLatInDec,
  macAddrToString
} = require('./tools.js')

const { updateFrameByType } = require('./../database/correctionsDatabase.js')
const {
  updateBaseLastUpdate,
  updateBaseMeanAcc,
  updateBasePosition
} = require('./../database/baseDatabase.js')

const polycrc = require('polycrc')
const crc24q = polycrc.crc(24, 0x1864CFB, 0x0000, 0x0000, false)

const isTypeValid = (msgtype) => {
  return config.messageType.find(type => type === msgtype) != null
}

const analyzeBaseData = async (rest, data, id) => {
  const res = await analyzeAndSaveData(rest, data, id)
  if (res.result !== 0) {
    console.log(color.base, '<-- [' + res.result + '] Rtcm Received ' + (res.response ? '(end)' : '(+)'))
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
  } else {
    return false
  }
}

const isCRCValid = (data) => {
  const crc = crc24q(data.slice(0, data.length - 3))
  return (((crc >> 16 & 0xff) === data[data.length - 3]) &&
  ((crc >> 8 & 0xff) === data[data.length - 2]) &&
  ((crc & 0xff) === data[data.length - 1]))
}

const analyzeBaseInfo = async (data, id, macAddr) => {
  await updateBaseLastUpdate(id)
  var dataInfo = data.toString().split('$')
  var meanAcc = data[0] << 24 | data[1] << 16 | data[2] << 8 | data[3]
  meanAcc /= 10000
  await updateBaseMeanAcc(id, meanAcc)
  if (meanAcc > 1) {
    console.log(color.base, '[BASE ' + macAddrToString(macAddr) + '] SVIN meanAcc: ' + meanAcc + 'm')
    logger.info('[BASE ' + macAddrToString(macAddr) + '] SVIN meanAcc: ' + meanAcc + 'm')
  } else {
    meanAcc *= 100
    console.log(color.base, '[BASE ' + macAddrToString(macAddr) + '] SVIN meanAcc: ' + meanAcc + 'cm')
    logger.info('[BASE ' + macAddrToString(macAddr) + '] SVIN meanAcc: ' + meanAcc + 'cm')
  }
  var ggaInfo = dataInfo[1].split(',')
  if ((ggaInfo[2]) && (ggaInfo[4]) && ggaInfo[9]) {
    await updateBasePosition(getLonLatInDec(ggaInfo[2]), getLonLatInDec(ggaInfo[4]), ggaInfo[9], ggaInfo[11], id)
  }
  return { value: '!got' }
}

const analyzeAndSaveData = async (rest, data, id) => {
  await updateBaseLastUpdate(id)
  var rtcmReceived = 0
  var restData = Buffer.from('')
  var responseOk = false
  data = Buffer.concat([rest, data])
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0xd3) {
      if (i + 4 > data.length) {
        restData = data.slice(i, data.length)
      } else {
        var length = (data[i + 1] % 4) * 256 + data[i + 2] + 6
        if (length > 0) {
          const msg = {
            length: length,
            type: data[i + 3] << 4 | data[i + 4] >> 4,
            data: data.slice(i, i + length)
          }
          i += msg.length - 1
          rtcmReceived++
          if (i > data.length - 1) {
            restData = msg.data
          } else {
            if (isTypeValid(msg.type)) {
              if (msg.type === 1230) {
                responseOk = true
              }
              if (isCRCValid(msg.data)) {
                await updateFrameByType(msg.type, msg.data, id)
              } else {
                console.log('CRC failed: ' + msg.type)
              }
            }
          }
        }
      }
    }
  }
  return {
    result: rtcmReceived,
    rest: restData,
    response: responseOk
  }
}

exports.analyzeAndSaveData = analyzeAndSaveData
exports.analyzeBaseInfo = analyzeBaseInfo
exports.analyzeBaseData = analyzeBaseData
