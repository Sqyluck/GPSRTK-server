const color = require('./../color.js')

const config = require('./config')

const { logger } = require('./../logger.js')

const polycrc = require('polycrc')
const crc24q = polycrc.crc(24, 0x1864CFB, 0x0000, 0x0000, false)

const { updateFrameByType } = require('./../database/correctionsDatabase.js')
const {
  updateBaseLastUpdate,
  updateBaseMeanAcc,
  updateBasePosition
} = require('./../database/baseDatabase.js')

const isTypeValid = (msgtype) => {
  return config.messageType.find(type => type === msgtype) != null
}

const printReceivedData = false

const getLonLatInDec = (value) => {
  return Math.round((Math.floor(Number(value) / 100) + (Number(value) % 100) / 60) * 10000000) / 10000000
}

const isCRCValid = (data) => {
  const crc = crc24q(data.slice(0, data.length - 3))
  return (((crc >> 16 & 0xff) === data[data.length - 3]) &&
  ((crc >> 8 & 0xff) === data[data.length - 2]) &&
  ((crc & 0xff) === data[data.length - 1]))
}

const analyzeAndSaveData = async (rest, data, id) => {
  await updateBaseLastUpdate(id)
  var rtcmReceived = 0
  var invalidData = ''
  var restData = Buffer.from('')
  var complete = [rest, data]
  var responseOk = false
  data = Buffer.concat(complete)
  if (data[0] === 0x21) {
    var dataInfo = data.toString().split('$')
    var svinInfo = dataInfo[0].split('!')
    if (svinInfo[1] === 'svinacc') {
      console.log(data[9].toString(16).padStart(2, '0') + ' ' + data[10].toString(16).padStart(2, '0') + ' ' + data[11].toString(16).padStart(2, '0') + ' ' + data[12].toString(16).padStart(2, '0'))
      var meanAcc = data[9] << 24 | data[10] << 16 | data[11] << 8 | data[12]
      meanAcc /= 10000
      await updateBaseMeanAcc(id, meanAcc)
      if (meanAcc > 1) {
        console.log(color.base, '[BASE] SVIN meanAcc: ' + meanAcc + 'm')
        logger.info('[BASE] SVIN meanAcc: ' + meanAcc + 'm')
      } else {
        meanAcc *= 100
        console.log(color.base, '[BASE] SVIN meanAcc: ' + meanAcc + 'cm')
        logger.info('[BASE] SVIN meanAcc: ' + meanAcc + 'cm')
      }
    }
    var ggaInfo = dataInfo[1].split(',')
    // console.log('[' + ggaInfo[2] + ', ' + ggaInfo[4] + ']')
    if ((ggaInfo[2]) && (ggaInfo[4])) {
      // console.log(getLonLatInDec(ggaInfo[2]) + ', ' + getLonLatInDec(ggaInfo[4]) + ', ' + id)
      await updateBasePosition(getLonLatInDec(ggaInfo[2]), getLonLatInDec(ggaInfo[4]), id)
    }
    // console.log('[BASE] Update base position')
    return { result: -1 }
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0xd3) {
      if (printReceivedData) {
        if (invalidData !== '') {
          console.log(color.FgRed, Buffer.from(invalidData, 'hex'))
          invalidData = ''
        }
      }
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
          if (printReceivedData) {
            for (var j = 0; j < msg.data.length; j++) {
              if (msg.data[j] < 16) {
                invalidData += '0' + msg.data[j].toString(16)
              } else {
                invalidData += msg.data[j].toString(16)
              }
              invalidData += ' '
            }
            console.log(color.FgBlue, invalidData + '\n')
            invalidData = ''
          }
          if (i > data.length - 1) {
            restData = msg.data
          } else {
            if (isTypeValid(msg.type)) {
              if (msg.type === 1230) {
                responseOk = true
              }
              // console.log('CRC: ' + isCRCValid(msg.data))
              if (isCRCValid(msg.data)) {
                await updateFrameByType(msg.type, msg.data, id)
              } else {
                console.log('CRC failed: ' + msg.type)
              }
            }
          }
        }
      }
    } else {
      if (data[i] < 16) {
        invalidData += '0' + data[i].toString(16)
      } else {
        invalidData += data[i].toString(16)
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
