const {
  addBaseToDatabase,
  getallBasesFromDatabase,
  deleteBaseFromDatabase,
  getClosestBase,
  getBaseById
} = require('./baseDatabase.js')

const {
  getFramesFromDatabase,
  resetCorrectionsTable
} = require('./correctionsDatabase.js')

const {
  asyncForEach
} = require('./database.js')

const main = async () => {
  var str = 'd300c343500075457c020000040a044500000000200080007d7ea2a8a69494888c00000007c15ff7f211065875023beb4fb620fffbd3f697e9b9875192b59ca509c705389e8bf1ef79c1cf98193de519d87864352a3dc63e84e33e52ba9f0e421f13a57e188d5fc725fe58d23e579bdf7305bf6012611ecce0ff542e1348d4c0100400f5c0100400fabe2001583e160541185a170521905a1704c04b98a16f541eb2feab42f3686cd1b3defbbe75a9eb5d000000000000000000000000000000000000000000e066b5'
  var hex = ''
  var i = 0
  for (i = 0; i < str.length; i++) {
    hex += str[i].toUpperCase()
    if (i % 2 === 1) {
      hex += ' '
    }
  }
  console.log(hex.length / 3)
  console.log(hex)
  var frame = 'd3 00 2f 43 20 00 35 4c 88 06 00 00 00 02 00 05 00 00 00 00 20 00 00 00 74 a4 74 d7 13 57 53 8a 85 82 3a db cc 13 e0 08 08 6b de d6 68 f5 d8 86 77 40 eb 81 57 ' +
  'd3 00 41 43 50 00 35 4c 88 06 00 00 00 02 00 05 00 00 00 00 20 00 00 00 74 a4 74 d0 00 71 35 75 38 03 d0 85 82 4e 2a 16 60 47 41 db cc 80 9f 00 40 10 d7 6f 6b 34 27 1d 7a 58 c4 21 38 3a 04 5f c3 ee 83 1d 97 24 89 ' +
  'd3 00 1e 43 c0 00 4e ab bc c6 00 00 00 10 00 00 00 00 00 00 20 00 00 00 53 7a 8d aa fe aa 9d 5a 10 8c f2 6a ' +
  'd3 00 24 43 f0 00 4e ab bc c6 00 00 00 10 00 00 00 00 00 00 20 00 00 00 53 5f a8 f5 97 6a ba 3d 55 3a 57 04 21 72 fc 80 d2 57 ' +
  'd3 00 33 44 60 00 35 4c 88 06 00 00 08 00 00 10 00 00 00 00 20 01 00 00 4a c2 eb 44 13 79 71 18 bd fa 62 e0 31 ff 3f 64 2d 00 00 00 00 00 00 00 00 00 00 00 00 '
  console.log(frame.length + ' : ' + frame.length / 3)
  // const boisblanc = { latitude: 50.632259, longitude: 3.020639 }
  // console.log(await getClosestBase(boisblanc.latitude, boisblanc.longitude))
  /*
  const result = await getFramesFromDatabase('5c94fc0ffb9a26434276ca47')
  result.forEach((res) => {
    console.log(res.data)
    var buffer = Buffer.from(res.data, 'hex')
    console.log(buffer)
  })
  */
  await resetBaseTable()
  await resetCorrectionsTable()
  // await createBase()
}

const resetBaseTable = async () => {
  const array = await getallBasesFromDatabase()
  asyncForEach(array, async (arr) => {
    console.log(await deleteBaseFromDatabase(arr._id))
  })
}

const createBase = async () => {
  const fougeres = { latitude: 47.461371, longitude: 1.339696 }
  const home = { latitude: 50.633437, longitude: 3.042425 }
  const paris = { latitude: 48.855326, longitude: 2.310574 }
  const boisblanc = { latitude: 50.632259, longitude: 3.020639 }
  console.log(await addBaseToDatabase(fougeres.latitude, fougeres.longitude))
  console.log(await addBaseToDatabase(boisblanc.latitude, boisblanc.longitude))
  console.log(await addBaseToDatabase(home.latitude, home.longitude))
  console.log(await addBaseToDatabase(paris.latitude, paris.longitude))
}

main()






/*
const fougeres = { latitude: 47.461371, longitude: 1.339696 }
const home = { latitude: 50.633437, longitude: 3.042425 }
const paris = { latitude: 48.855326, longitude: 2.310574 }
const boisblanc = { latitude: 50.632259, longitude: 3.020639 }
console.log(await addBaseToDatabase(fougeres.latitude, fougeres.longitude))
console.log(await addBaseToDatabase(boisblanc.latitude, boisblanc.longitude))
console.log(await addBaseToDatabase(home.latitude, home.longitude))
console.log(await addBaseToDatabase(paris.latitude, paris.longitude))
var id = await getClosestBase(50.632524, 3.020151)
console.log(await getBaseById(id))
*/
