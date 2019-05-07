const analyzeAndGetData = async (data) => {
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

const NMEACrc = (nmea) => {
  let crc = 0
  for (let i = 1; i < nmea.length - 5; i++) {
    crc ^= nmea[i]
  }
  return crc.toString(16).toUpperCase() === nmea.toString().slice(nmea.length - 4, nmea.length - 2)
}

exports.analyzeAndGetData = analyzeAndGetData
exports.getStringStatus = getStringStatus
