const config = require('./config.json')

const prepareFrame = (frame, type) => {
  let size = null
  let str = ''
  if (frame[0] === '!') {
    size = new Uint8Array([frame.length << 8, frame.length])
    str = size[0].toString(16).padStart(2, '0') + size[1].toString(16).padStart(2, '0') + '21' + Buffer.from(frame.slice(1)).toString('hex')
  } else {
    size = new Uint8Array([((frame.length / 2) + 1) >> 8, (frame.length / 2) + 1])
    str = size[0].toString(16).padStart(2, '0') + size[1].toString(16).padStart(2, '0') + '21' + frame
  }
  return Buffer.from(str, 'hex')
}

const prepareRTCMArray = (rtcm) => {
  const sortArr = rtcm.sort((a, b) => {
    return b.data.length - a.data.length
  })
  let result = ['']
  let nbMsg = 0
  let i = 0
  while (sortArr.length !== 0) {
    if (result[nbMsg].length + sortArr[i].data.length < config.MAX_DATA_LEN * 2) {
      result[nbMsg] += sortArr[i].data
      sortArr.splice(i--, 1)
    }
    if ((i < sortArr.length - 1) || (sortArr.length === 0)) {
      i++
    } else {
      result.push('')
      nbMsg++
      i = 0
    }
  }
  if (result[nbMsg].length < (config.MAX_DATA_LEN - 3) * 2) {
    result[nbMsg] += '0021fe'
  } else {
    result.push('0021fe')
  }
  return result
}

const logDatetime = () => {
  return new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
}

const getLonLatInDec = (value) => {
  return Math.round((Math.floor(Number(value) / 100) + (Number(value) % 100) / 60) * 10000000) / 10000000
}

const getStringStatus = (status) => {
  switch (Number(status)) {
    case 0:
      return 'invalid'
    case 1:
      return '2D/3D'
    case 2:
      return 'DGNSS'
    case 4:
      return 'Fixed RTK'
    case 5:
      return 'Float RTK'
    case 6:
      return 'Dead Reckoning'
    default:
      return 'Unknow'
  }
}

exports.prepareRTCMArray = prepareRTCMArray
exports.prepareFrame = prepareFrame
exports.logDatetime = logDatetime
exports.getLonLatInDec = getLonLatInDec
exports.getStringStatus = getStringStatus
