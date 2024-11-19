import { getExistingConnection } from './connections'

module.exports = async function connect() {
  // now this method does not create new connections, it waits for a explicit connection to be ready.

  const uri = process.env.MONGO_URL
  if (global.orionMainDatabaseConnection) return global.orionMainDatabaseConnection

  const connection = await getExistingConnection(uri)
  global.orionMainDatabaseConnection = connection
  const { client, database } = await connection
  global.orionMainDatabaseClient = client
  global.orionMainDatabase = database

  return connection
}
