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

const lamb = new Map()
lamb.set('Lambert1', { n: 0.7604059656, C: 11603796.98, Xs: 600000.000, Ys: 5657616.674, e: 0.08248325676, k0: 2.33722916667 })
lamb.set('Lambert2', { n: 0.7289686274, C: 11745793.39, Xs: 600000.000, Ys: 6199695.768, e: 0.08248325676, k0: 2.33722916667 })
lamb.set('Lambert3', { n: 0.6959127966, C: 11947992.52, Xs: 600000.000, Ys: 6791905.085, e: 0.08248325676, k0: 2.33722916667 })
lamb.set('Lambert4', { n: 0.6712679322, C: 12136281.99, Xs: 234.358, Ys: 7239161.542, e: 0.08248325676, k0: 2.33722916667 })
lamb.set('Lambert93', { n: 0.725607765053267, C: 11754255.426096, Xs: 700000.000, Ys: 12655612.049876, e: 0.0818191910428158, k0: 3 })

const coordToLambert = (proj, lat, lng) => {
  lat = lat * Math.PI / 180
  lng = (lng - lamb.get(proj).k0) * Math.PI / 180
  let latIso = Math.atanh(Math.sin(lat)) - lamb.get(proj).e * Math.atanh(lamb.get(proj).e * Math.sin(lat)) // latitude isométrique
  let x = ((lamb.get(proj).C * Math.exp(-lamb.get(proj).n * (latIso))) * Math.sin(lamb.get(proj).n * lng) + lamb.get(proj).Xs)
  let y = (lamb.get(proj).Ys - (lamb.get(proj).C * Math.exp(-lamb.get(proj).n * (latIso))) * Math.cos(lamb.get(proj).n * lng))
  return { X: x, Y: y }
}

const macAddrToString = (macAddr) => {
  let macAddrStr = ''
  for (let i = 0; i < 8; i++) {
    if (i !== 0) {
      macAddrStr += ':'
    }
    macAddrStr += macAddr[i].toString(16).padStart(2, '0')
  }
  return macAddrStr
}

exports.prepareRTCMArray = prepareRTCMArray
exports.prepareFrame = prepareFrame
exports.logDatetime = logDatetime
exports.getLonLatInDec = getLonLatInDec
exports.getStringStatus = getStringStatus
exports.coordToLambert = coordToLambert
exports.macAddrToString = macAddrToString
