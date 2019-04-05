const analyzeAndGetData = async (data) => {
  const positionData = data.toString().split(',')
  return {
    latitude: positionData[2],
    longitude: positionData[4],
    status: getStringStatus(positionData[6]),
    result: (positionData[2] !== '') && (positionData[4] !== '') && (positionData[2] != null) && (positionData[4] != null) && (positionData[6] != null)
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

exports.analyzeAndGetData = analyzeAndGetData
exports.getStringStatus = getStringStatus
