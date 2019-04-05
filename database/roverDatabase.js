const config = require('./config.json')

const {
  connectToDatabase,
  ObjectId
} = require('./database.js')

const addRoverToDatabase = async (latitude, longitude, status) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.rover).insertOne(
      { latitude, longitude, status, fixed: false })
    return result.ops[0]._id
  } catch (err) {
    console.log('addRoverToDatabase: ' + err)
  }
}

const updateRoverPositionById = async (latitude, longitude, status, roverId, fixed) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.rover).findOneAndUpdate(
      { _id: ObjectId(roverId) },
      { $set: { latitude, longitude, status, fixed } })
    // console.log('update rover: ' + JSON.stringify(result))
    return result != null
  } catch (err) {
    console.log('updateRoverrPositionById: ' + err)
  }
}

const setRoverFixed = async (roverId) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.rover).findOneAndUpdate(
      { _id: ObjectId(roverId) },
      { $set: { fixed: true } })
    console.log('update rover fixed: ' + JSON.stringify(result))
    return result != null
  } catch (err) {
    console.log('setRoverFixed: ' + err)
  }
}

const getallRoversFromDatabase = async () => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.rover).find({})
    return result.toArray()
  } catch (err) {
    console.log('getallRoversFromDatabase: ' + err)
  }
}

const deleteRoverById = async (roverId) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.rover).deleteOne(
      { _id: ObjectId(roverId) })
    // console.log(result.result)
    return result != null
  } catch (err) {
    console.log('deleteRoverById: ' + err)
  }
}

const deleteAllRovers = async () => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.rover).remove({})
    console.log('remove: ' + result)
    return result != null
  } catch (err) {
    console.log('deleteAllRovers: ' + err)
  }
}

exports.addRoverToDatabase = addRoverToDatabase
exports.updateRoverPositionById = updateRoverPositionById
exports.deleteRoverById = deleteRoverById
exports.deleteAllRovers = deleteAllRovers
exports.getallRoversFromDatabase = getallRoversFromDatabase
exports.setRoverFixed = setRoverFixed
