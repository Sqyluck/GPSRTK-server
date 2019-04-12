const color = require('./../color.js')

const config = require('./config')

const { updateFrameByType } = require('./../database/correctionsDatabase.js')
const {
  updateBaseLastUpdate,
  updateBaseMeanAcc,
  updateBasePosition
} = require('./../database/baseDatabase.js')
const { asyncForEach } = require('./../database/database.js')

const { getLonLatInDec } = require('./frameAnalyzer.js')

const isTypeValid = (msgtype) => {
  return config.messageType.find(type => type === msgtype) != null
}

const printReceivedData = false

const analyzeAndSaveData = async (rest, data, id) => {
  await updateBaseLastUpdate(id)
  var rtcmReceived = 0
  var invalidData = ''
  var restData = Buffer.from('')
  var complete = [rest, data]
  data = Buffer.concat(complete)
  if (data[0] === 0x21) {
    var dataInfo = data.toString().split('$')
    var svinInfo = dataInfo[0].split('!')
    if (svinInfo[1] === 'svinacc') {
      var meanAcc = Number(svinInfo[2]) / 10000
      await updateBaseMeanAcc(id, meanAcc)
      if (meanAcc > 100) {
        console.log('[BASE] SVIN meanAcc: ' + meanAcc + 'm')
      } else {
        meanAcc /= 100
        console.log('[BASE] SVIN meanAcc: ' + meanAcc + 'cm')
      }
    }
    var ggaInfo = dataInfo[1].split(',')
    await updateBasePosition(getLonLatInDec(ggaInfo[2]), getLonLatInDec(ggaInfo[4]), id)
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
              await updateFrameByType(msg.type, msg.data, id)
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
    rest: restData
  }
}

exports.analyzeAndSaveData = analyzeAndSaveData
