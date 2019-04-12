const config = require('./config.json')

const {
  connectToDatabase,
  asyncForEach,
  ObjectId
} = require('./database.js')

const { deleteCorrectionsbyBaseId } = require('./correctionsDatabase.js')

const color = require('./../color.js')

const addBaseToDatabase = async (latitude, longitude) => {
  try {
    const db = await connectToDatabase()
    const baseArray = await getallBasesFromDatabase()
    var baseId = null
    await asyncForEach(baseArray, async (base) => {
      // baseArray.forEach((base) => {
      var dist = distance(base.latitude, base.longitude, latitude, longitude)
      if (dist < 10) {
        baseId = base._id
        await updateBasePosition(latitude, longitude, baseId)
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
          lastUpdate: Date.now(),
          meanAcc: 0
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
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).find()
    return result.toArray()
  } catch (err) {
    console.log('getBasesInformationsFromDatabase: ' + err)
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
    console.log('getBaseById: ' + err)
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
    console.log('updateBaseLastUpdate: ' + err)
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
    console.log('updateBaseMeanAcc: ' + err)
  }
}

const updateBasePosition = async (latitude, longitude, id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: { latitude, longitude } }
    )
    // console.log(result)
  } catch (err) {
    console.log('updateBasePosition: ' + err)
  }
}

const deleteBaseFromDatabase = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).deleteOne(
      { _id: id })
    return result.result.n === 1
  } catch (err) {
    console.log('updateFrameByType: ' + err)
  }
}

const isBaseValid = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.base).findOne({ _id: id, lastUpdate: { $gt: Date.now() - config.validity } })
    return result != null
  } catch (err) {
    console.log('isbasevalid: ' + err)
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
      console.log(color.rover, 'i : [' + i + '], distance: ' + dist + ', base valid: ' + await isBaseValid(base._id))
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
      console.log(color.rover, '[ROVER] Find closest base: ' + min.id + ' : ' + min.dist + 'm')
    } else {
      console.log(color.rover, '[ROVER] can\'t find any base: ' + min.id + ' : ' + min.dist + 'm')
    }
    return min.id
  } catch (err) {
    console.log('getClosestBase: ' + err)
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
