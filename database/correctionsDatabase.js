const config = require('./config.json')

const {
  connectToDatabase,
  ObjectId
} = require('./database.js')

const getFramesFromDatabase = async (baseId) => {
  try {
    const db = await connectToDatabase()
    var result = await db.collection(config.collections.corrections).find(
      {
        baseId: ObjectId(baseId),
        lastUpdate: { $gt: Date.now() - config.validity }
      }
    ).sort({ type: -1 })
    return result.toArray()
  } catch (err) {
    console.log('addFrameToDatabase: ' + err)
  }
}

const updateFrameByType = async (type, data, baseId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.corrections).findOneAndUpdate(
      { type, baseId },
      { $set: {
        type,
        baseId,
        data: data.toString('hex'),
        lastUpdate: Date.now()
      } },
      { upsert: true })
    return result != null
  } catch (err) {
    console.log('updateFrameByType: ' + err)
  }
}

const resetCorrectionsTable = async () => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.corrections).deleteMany({})
    return result.result.n !== 0
  } catch (err) {
    console.log('resetCorrectionsTable: ' + err)
  }
}

const deleteCorrectionsbyBaseId = async (baseId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.corrections).deleteMany({ baseId })
    console.log(result)
    return result.result.n !== 0
  } catch (err) {
    console.log('resetCorrectionsTable: ' + err)
  }
}

exports.getFramesFromDatabase = getFramesFromDatabase
exports.updateFrameByType = updateFrameByType
exports.resetCorrectionsTable = resetCorrectionsTable
exports.deleteCorrectionsbyBaseId = deleteCorrectionsbyBaseId
