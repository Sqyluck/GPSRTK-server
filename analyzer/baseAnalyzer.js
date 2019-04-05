const color = require('./../color.js')

const config = require('./config')

const { updateFrameByType } = require('./../database/correctionsDatabase.js')
const { updateBaseLastUpdate } = require('./../database/baseDatabase.js')

const isTypeValid = (msgtype) => {
  return config.messageType.find(type => type === msgtype) != null
}

const printReceivedData = false

const analyzeAndSaveData = async (rest, data, id) => {
  // console.log(color.FgBlue, '=================================== DATA [' + data.length + '] ===================================')
  // console.log(color.FgMagenta, rest)
  await updateBaseLastUpdate(id)
  var invalidData = ''
  var restData = Buffer.from('')
  var complete = [rest, data]
  data = Buffer.concat(complete)
  for (var i = 0; i < data.length; i++) {
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
        var length = data[i + 1] * 256 + data[i + 2] + 6
        if (length > 0) {
          const msg = {
            length: length,
            type: data[i + 3] << 4 | data[i + 4] >> 4,
            data: data.slice(i, i + length)
          }
          i += msg.length - 1
          // console.log(color.FgBlue, msg.data)
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
            if (msg.data.length !== msg.length) {
              console.log('============================================message incomplet============================================')
            }
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
  // console.log(color.FgYellow, restData)
  return {
    result: true,
    rest: restData
  }
}

exports.analyzeAndSaveData = analyzeAndSaveData
