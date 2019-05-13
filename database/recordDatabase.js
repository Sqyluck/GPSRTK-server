const config = require('./config.json')
const fs = require('fs')
const path = require('path')

const {
  connectToDatabase,
  ObjectId,
  asyncForEach
} = require('./database.js')

const {
  getTrueAltitudeById
} = require('./baseDatabase.js')

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

const createRecord = async (roverId, baseId) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).insertOne(
      { roverId, baseId, date: Date.now(), data: [] })
    return result.ops[0]._id
  } catch (err) {
    console.log('createRecord: ' + err)
  }
}

const addPostionToRecord = async (lat, lng, alt, recordId) => {
  try {
    const db = await connectToDatabase()
    let pos = { lat, lng, alt }
    console.log(pos)
    const result = await db.collection(config.collections.record).findOneAndUpdate(
      { _id: recordId },
      { $push: { data: pos } }
    )
    return result.lastErrorObject.n !== 0
  } catch (err) {
    console.log('addPostionToRecord: ' + err)
  }
}

const createCsvFileByRecordId = async (recordId, mode) => {
  try {
    let stream = null
    if (mode === 'csv') {
      stream = fs.createWriteStream(path.join(__dirname, '/../public/data.csv'))
    } else if (mode === 'txt') {
      stream = fs.createWriteStream(path.join(__dirname, '/../public/data.txt'))
    }
    console.log('stream opened')
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).findOne(
      { _id: ObjectId(recordId) }
    )
    const altitude = await getTrueAltitudeById(result.baseId)
    let str = ''
    let number = 0
    console.log('trueAltitude: ' + altitude)
    if (mode === 'csv') {
      str += '#Numero; Latitude; Longitude; altitude\n'
      await asyncForEach(result.data, (pos) => {
        console.log(pos.lat + ';' + pos.lng + ';' + (pos.alt + altitude))
        str += (number++) + ';' + pos.lat + ';' + pos.lng + ';' + Math.round((pos.alt + altitude) * 1000) / 1000 + '\n'
      })
    } else if (mode === 'txt') {
      await asyncForEach(result.data, (pos) => {
        str += pos.lng + ' ' + pos.lat + ' ' + Math.round((pos.alt + altitude) * 1000) / 1000 + ' \r\n'
      })
    }
    stream.write(str)
    stream.end()
    console.log('stream ended')
    return true
  } catch (err) {
    console.log('createCsvFile: ' + err)
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
exports.createRecord = createRecord
exports.addPostionToRecord = addPostionToRecord
exports.createCsvFileByRecordId = createCsvFileByRecordId
