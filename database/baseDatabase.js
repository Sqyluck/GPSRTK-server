const config = require('./config.json')

const {
  connectToDatabase,
  asyncForEach,
  ObjectId
} = require('./database.js')

const { deleteCorrectionsbyBaseId } = require('./correctionsDatabase.js')

const color = require('./../color.js')

const addBaseToDatabase = async (latitude, longitude, altitude, macAddr) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOneAndUpdate(
      { macAddr },
      { $set: {
        macAddr,
        latitude,
        longitude,
        altitude,
        date: Date.now(),
        lastUpdate: Date.now(),
        meanAcc: 0
      } },
      { upsert: true })
    if (result.lastErrorObject.updatedExisting) {
      console.log(color.base, '[BASE] Update an existing base')
      return result.value._id
    } else {
      console.log(color.base, '[BASE] Insert a new base')
      return result.lastErrorObject.upserted
    }
  } catch (err) {
    console.log(color.base, 'addBaseToDatabase: ' + err)
  }
}

const getallBasesFromDatabase = async () => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).find()
    return result.toArray()
  } catch (err) {
    console.log(color.base, 'getBasesInformationsFromDatabase: ' + err)
  }
}

const setTrueAltitudeById = async (altitude, baseId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).updateOne(
      { _id: ObjectId(baseId) },
      { $set: { trueAltitude: altitude } }
    )
    return result.result.n != null
  } catch (err) {
    console.log(color.base, 'getBaseById: ' + err)
  }
}

const getRelativeAltitudeByBaseId = async (altitude, baseId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOne(
      { _id: baseId }
    )
    return altitude - result.altitude + (result.trueAltitude ? result.trueAltitude : 0)
  } catch (err) {
    console.log(color.base, 'getBaseById: ' + err)
  }
}

const getBaseById = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOne(
      { _id: id }
    )
    return result
  } catch (err) {
    console.log(color.base, 'getBaseById: ' + err)
  }
}

const updateBaseLastUpdate = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOneAndUpdate(
      { _id: id },
      { $set: { lastUpdate: Date.now() } }
    )
  } catch (err) {
    console.log(color.base, 'updateBaseLastUpdate: ' + err)
  }
}

const updateBaseMeanAcc = async (id, meanAcc) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOneAndUpdate(
      { _id: id },
      { $set: { meanAcc } }
    )
  } catch (err) {
    console.log(color.base, 'updateBaseMeanAcc: ' + err)
  }
}

const updateBasePosition = async (latitude, longitude, altitude, id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: { latitude, longitude, altitude } }
    )
    // console.log(color.base, result)
  } catch (err) {
    console.log(color.base, 'updateBasePosition: ' + err)
  }
}

const deleteBaseFromDatabase = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).deleteOne(
      { _id: id })
    return result.result.n === 1
  } catch (err) {
    console.log(color.base, 'updateFrameByType: ' + err)
  }
}

const isBaseValid = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOne({ _id: id, lastUpdate: { $gt: Date.now() - config.validity } })
    return result != null
  } catch (err) {
    console.log(color.base, 'isbasevalid: ' + err)
  }
}

const getClosestBase = async (latitude, longitude) => {
  try {
    const baseArray = await getallBasesFromDatabase()
    const min = {
      dist: -1,
      id: null
    }
    await asyncForEach(baseArray, async (base, i) => {
      var dist = distance(base.latitude, base.longitude, latitude, longitude)
      console.log(color.rover, 'i : [' + i + '], distance: ' + dist * 1000 + ', base valid: ' + await isBaseValid(base._id))
      if (await isBaseValid(base._id)) {
        if ((dist < min.dist) || (min.dist === -1)) {
          min.dist = dist
          min.id = base._id
        }
      } else {
        await deleteBaseFromDatabase(base._id)
        await deleteCorrectionsbyBaseId(base._id)
      }
    })

    if (min.dist !== -1) {
      console.log(color.rover, '[ROVER] Find closest base: ' + min.id + ' : ' + min.dist * 1000 + 'm')
    } else {
      console.log(color.rover, '[ROVER] can\'t find any base: ' + min.id + ' : ' + min.dist * 1000 + 'm')
    }
    return min.id
  } catch (err) {
    console.log(color.base, 'getClosestBase: ' + err)
  }
}

const distance = (lat1, lon1, lat2, lon2) => {
  var p = 0.017453292519943295 // Math.PI / 180
  var c = Math.cos
  var a = 0.5 - c((lat2 - lat1) * p) / 2 +
          c(lat1 * p) * c(lat2 * p) *
          (1 - c((lon2 - lon1) * p)) / 2
  return 12742 * Math.asin(Math.sqrt(a))
}

exports.addBaseToDatabase = addBaseToDatabase
exports.getallBasesFromDatabase = getallBasesFromDatabase
exports.deleteBaseFromDatabase = deleteBaseFromDatabase
exports.getClosestBase = getClosestBase
exports.getBaseById = getBaseById
exports.updateBaseLastUpdate = updateBaseLastUpdate
exports.updateBasePosition = updateBasePosition
exports.updateBaseMeanAcc = updateBaseMeanAcc
exports.getRelativeAltitudeByBaseId = getRelativeAltitudeByBaseId
exports.setTrueAltitudeById = setTrueAltitudeById
