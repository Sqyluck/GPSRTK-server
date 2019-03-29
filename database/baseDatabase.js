const config = require('./config.json')

const {
  connectToDatabase,
  asyncForEach
} = require('./database.js')

const color = require('./../color.js')

const addBaseToDatabase = async (latitude, longitude) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const baseArray = await getallBasesFromDatabase()
    var baseId = null
    await asyncForEach(baseArray, async (base) => {
      // baseArray.forEach((base) => {
      var dist = distance(base.latitude, base.longitude, latitude, longitude)
      if (dist < 10) {
        baseId = base._id
        await updateBasePosition(base.latitude, base.longitude, baseId)
        console.log(color.base, 'base found with distance: ' + dist + 'm' + ', base: ' + baseId)
      }
    })
    if (baseId) {
      return baseId
    } else {
      console.log('insertOne ')
      const result = await db.collection(config.collections.base).insertOne(
        {
          latitude,
          longitude,
          date: Date.now(),
          lastUpdate: Date.now()
        }
      )
      return result.ops[0]._id
    }
  } catch (err) {
    console.log('addBaseToDatabase: ' + err)
  }
}

const getallBasesFromDatabase = async () => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.base).find()
    return result.toArray()
  } catch (err) {
    console.log('getBasesInformationsFromDatabase: ' + err)
  }
}

const getBaseById = async (id) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.base).findOne(
      { _id: id }
    )
    return result
  } catch (err) {
    console.log('getBaseById: ' + err)
  }
}

const updateBaseStatus = async (id) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    await db.collection(config.collections.base).findOneAndUpdate(
      { _id: id },
      { $set: { lastUpdate: Date.now() } }
    )
  } catch (err) {
    console.log('updateBaseStatus: ' + err)
  }
}

const updateBasePosition = async (latitude, longitude, id) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    await db.collection(config.collections.base).findOneAndUpdate(
      { _id: id },
      { $set: { latitude, longitude } }
    )
  } catch (err) {
    console.log('updateBasePosition: ' + err)
  }
}

const deleteBaseFromDatabase = async (id) => {
  try {
    const db = await connectToDatabase(config.database.gpsrtk)
    const result = await db.collection(config.collections.base).deleteOne(
      { _id: id })
    return result.result.n === 1
  } catch (err) {
    console.log('updateFrameByType: ' + err)
  }
}

const getClosestBase = async (latitude, longitude) => {
  try {
    const baseArray = await getallBasesFromDatabase()
    const min = {
      dist: distance(baseArray[0].latitude, baseArray[0].longitude, latitude, longitude),
      id: baseArray[0]._id
    }
    console.log(color.rover, 'i : [0], distance: ' + min.dist)
    for (var i = 1; i < baseArray.length; i++) {
      var dist = distance(baseArray[i].latitude, baseArray[i].longitude, latitude, longitude)
      console.log(color.rover, 'i : [' + i + '], distance: ' + dist)
      if (dist < min.dist) {
        min.dist = dist
        min.id = baseArray[i]._id
      }
    }
    return min.id
  } catch (err) {
    console.log('getClosestBase: ' + err)
  }
}

const distance = (lat1, lon1, lat2, lon2) => {
  var p = 0.017453292519943295
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
exports.updateBaseStatus = updateBaseStatus
