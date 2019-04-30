const config = require('./config.json')

const {
  connectToDatabase,
  ObjectId
} = require('./database.js')

const addRecord = async (name, data) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).insertOne(
      { name, data })
    return result != null
  } catch (err) {
    console.log('addRecord: ' + err)
  }
}

const getRecord = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).findOne({
      _id: ObjectId(id)
    })
    return result
  } catch (err) {
    console.log('getRecord: ' + err)
  }
}

const deleteRecord = async (id) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).deleteOne({
      _id: ObjectId(id)
    })
    return result.result.n !== 0
  } catch (err) {
    console.log('deleteRecord: ' + err)
  }
}

const getAllRecords = async () => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).find({})
    return result.toArray()
  } catch (err) {
    console.log('getAllRecords: ' + err)
  }
}

exports.addRecord = addRecord
exports.getRecord = getRecord
exports.deleteRecord = deleteRecord
exports.getAllRecords = getAllRecords
