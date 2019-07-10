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

const {
  coordToLambert,
  coordToCCLambert } = require('./../analyzer/tools.js')

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

const addPostionToRecord = async (lat, lng, alt, recordId, status) => {
  try {
    const db = await connectToDatabase()
    let pos = { lat, lng, alt, date: Date.now(), status }
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
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).findOne(
      { _id: ObjectId(recordId) }
    )
    const altitude = await getTrueAltitudeById(result.baseId)
    let str = ''
    let number = 0
    if (mode === 'csv') {
      str += '#Numero; Latitude; Longitude; X lambertCC50; Y lambertCC50; X lambert 93; Y lambert 93; altitude\n'
      await asyncForEach(result.data, (pos) => {
        if (pos.status) {
          let lambertI = coordToCCLambert(pos.lat, pos.lng, 9)
          let lambert93 = coordToLambert('Lambert93', pos.lat, pos.lng)
          str += (number++) + ';' + pos.lat + ';' + pos.lng + ';' + (lambertI.X) + ';' + (lambertI.Y) + ';' + lambert93.X + ';' + lambert93.Y + ';' + Math.round((pos.alt + altitude) * 1000) / 1000 + '\n'
        }
      })
    } else if (mode === 'txt') {
      await asyncForEach(result.data, (pos) => {
        str += pos.lng + ' ' + pos.lat + ' ' + Math.round((pos.alt + altitude) * 1000) / 1000 + ' \r\n'
      })
    }
    stream.write(str)
    stream.end()
    return true
  } catch (err) {
    console.log('createCsvFileByRecordId: ' + err)
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

const deleteEmptyRecords = async () => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection(config.collections.record).deleteMany({
      data: { $size: 0 }
    })
    console.log(result.results)
    return result.result.n !== 0
  } catch (err) {
    console.log('deleteEmptyRecords: ' + err)
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
exports.deleteEmptyRecords = deleteEmptyRecords
