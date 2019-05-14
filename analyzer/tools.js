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

const ln = (val) => {
  return (Math.log(val) / Math.log(2))
}

const latLngToLambert1 = (lat, lng) => {
  console.log('{lat: ' + lat + ', lng: ' + lng + '}')
  lat = lat * Math.PI / 180
  lng = lng * Math.PI / 180
  console.log('{lat: ' + lat + ', lng: ' + lng + '}')
  const Xs = 600000
  const Ys = 5657616.674
  const k0 = 2.33722916667 * Math.PI / 180
  // const k0 = 0.99987734
  const n = 0.7604059656
  const e = 0.08248325676
  const C = 11603796.98
  const L = (1 / 2) * ln((1 + Math.sin(lat)) / (1 - Math.sin(lat))) - (e / 2) * ln((1 + e * Math.sin(lat)) / (1 - e * Math.sin(lat)))
  const R = C * Math.exp(-(n * L))
  const W = n * (lng - k0)
  const res = { X: (Xs + R * Math.sin(W)), Y: (Ys - R * Math.cos(W)) }
  console.log(res)
  return { X: (Xs + R * Math.sin(W)), Y: (Ys - R * Math.cos(W)) }
}

exports.prepareRTCMArray = prepareRTCMArray
exports.prepareFrame = prepareFrame
exports.logDatetime = logDatetime
exports.getLonLatInDec = getLonLatInDec
exports.getStringStatus = getStringStatus
exports.latLngToLambert1 = latLngToLambert1
