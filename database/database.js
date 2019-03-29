/**
 * @file Felico detabase helper library
 * @version 1.0.0
 * @module index.js
 */

// - global configuration -
const config = require('./config.json')

// - MongoDB configuration -
const { MongoClient, ObjectId } = require('../node_modules/mongodb')
const mongoClient = new MongoClient(config.mongoUri, { useNewUrlParser: true })
const mongoConnection = mongoClient.connect()

const connectToDatabase = async (database) => {
  try {
    // console.log('Connection to database')
    const connect = mongoConnection
    await connect
    return mongoClient.db(database)
  } catch (err) {
    console.log('connectToDatabase : Unable to connect database : ' + err)
  }
}

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

exports.ObjectId = ObjectId
exports.connectToDatabase = connectToDatabase
exports.asyncForEach = asyncForEach
