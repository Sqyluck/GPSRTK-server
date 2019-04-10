const color = require('./../color.js')

const config = require('./config')

const { updateFrameByType } = require('./../database/correctionsDatabase.js')
const { updateBaseLastUpdate } = require('./../database/baseDatabase.js')
const { asyncForEach } = require('./../database/database.js')

/*
var arrayMsg = []
config.messageType.forEach((msg) => {
  arrayMsg.push({ type: msg, n: 0, length: 0 })
})
*/

const isTypeValid = (msgtype) => {
  return config.messageType.find(type => type === msgtype) != null
}

const printReceivedData = false

const analyzeAndSaveData = async (rest, data, id) => {
  // console.log(color.FgBlue, '=================================== DATA [' + data.length + '] ===================================')
  // console.log(color.FgMagenta, rest)
  await updateBaseLastUpdate(id)
  var rtcmReceived = 0
  var invalidData = ''
  var restData = Buffer.from('')
  var complete = [rest, data]
  data = Buffer.concat(complete)
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
              /* arrayMsg.forEach((arr) => {
                if (arr.type === msg.type) {
                  arr.n++
                  arr.length = msg.length
                }
              }) */
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
  /* arrayMsg.forEach((el) => {
    var n = el.n.toString()
    while (n.length < 4) {
      n = n + ' '
    }
    console.log(' : ' + el.type + ': ' + n + ' (' + el.length + ')')
  }) */
  // console.log(strResult)
  return {
    result: rtcmReceived,
    rest: restData
  }
}

exports.analyzeAndSaveData = analyzeAndSaveData
