const config = require('./config.json')

const {
  connectToDatabase,
  ObjectId
} = require('./database.js')

const color = require('./../color.js')

const { getRelativeAltitudeByBaseId } = require('./baseDatabase.js')

const addRoverToDatabase = async (latitude, longitude, altitude, status, macAddr, baseId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.rover).findOneAndUpdate(
      { macAddr },
      { $set: { latitude, longitude, altitude, status, fixed: false } },
      { upsert: true })
    if (result.lastErrorObject.updatedExisting) {
      console.log(color.rover, '[ROVER] Update an existing rover')
      return result.value._id
    } else {
      console.log(color.rover, '[ROVER] Insert a new rover')
      return result.lastErrorObject.upserted
    }
  } catch (err) {
    console.log(color.rover, 'addRoverToDatabase: ' + err)
  }
}

const updateRoverPositionById = async (latitude, longitude, altitude, status, roverId, fixed, baseId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.rover).findOneAndUpdate(
      { _id: ObjectId(roverId) },
      { $set: { latitude, longitude, altitude, status, fixed } })
    return result != null
  } catch (err) {
    console.log(color.rover, 'updateRoverrPositionById: ' + err)
  }
}

const setRoverFixed = async (roverId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.rover).findOneAndUpdate(
      { _id: ObjectId(roverId) },
      { $set: { fixed: true } })
    console.log(color.rover, 'update rover fixed: ' + JSON.stringify(result))
    return result != null
  } catch (err) {
    console.log(color.rover, 'setRoverFixed: ' + err)
  }
}

const getallRoversFromDatabase = async () => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.rover).find({})
    return result.toArray()
  } catch (err) {
    console.log(color.rover, 'getallRoversFromDatabase: ' + err)
  }
}

const deleteRoverById = async (roverId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.rover).deleteOne(
      { _id: ObjectId(roverId) })
    // console.log(color.rover, result.result)
    return result != null
  } catch (err) {
    console.log(color.rover, 'deleteRoverById: ' + err)
  }
}

const deleteAllRovers = async () => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.rover).remove({})
    console.log(color.rover, 'remove: ' + result)
    return result != null
  } catch (err) {
    console.log(color.rover, 'deleteAllRovers: ' + err)
  }
}

const getRoverById = async (roverId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.rover).findOne({
      _id: ObjectId(roverId)
    })
    return result
  } catch (err) {
    console.log(color.rover, 'deleteAllRovers: ' + err)
  }
}

exports.addRoverToDatabase = addRoverToDatabase
exports.updateRoverPositionById = updateRoverPositionById
exports.deleteRoverById = deleteRoverById
exports.deleteAllRovers = deleteAllRovers
exports.getallRoversFromDatabase = getallRoversFromDatabase
exports.setRoverFixed = setRoverFixed
exports.getRoverById = getRoverById
