const connectToDatabase = require('./connectToDatabase')

module.exports = async function() {
  const uri = process.env.MONGO_URL
  const connection = connectToDatabase(uri)
  global.orionMainDatabaseConnection = connection

  const {client, database} = await connection
  global.orionMainDatabaseClient = client
  global.orionMainDatabase = database

  return database
}
