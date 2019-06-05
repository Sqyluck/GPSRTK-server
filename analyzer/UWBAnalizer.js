
const getAngleRad = (pos1, pos2) => {
  const xDiff = pos2.X - pos1.X
  const yDiff = pos2.Y - pos1.Y
  return Math.atan2(xDiff, yDiff)
}

const saveInMapSystem = (data) => {
  const rotation = getAngleRad(data[0], data[1])
  const xAbs = data[0].X
  const yAbs = data[0].Y
  const iRot = [Math.cos(rotation), Math.sin(rotation)]
  const jRot = [-Math.sin(rotation), Math.cos(rotation)]
  for (let i = 2; i < data.length; i++) {
    data[i].x2 = Math.round((iRot[0] * data[i].X + jRot[0] * data[i].Y + xAbs) * 100) / 100
    data[i].y2 = Math.round((iRot[1] * data[i].X + jRot[1] * data[i].Y + yAbs) * 100) / 100
  }
  // save in database
  console.log(data)
}

exports.saveInMapSystem = saveInMapSystem
