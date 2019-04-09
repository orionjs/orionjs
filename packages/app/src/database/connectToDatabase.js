const {MongoClient} = require('mongodb')
const getDbName = require('./getDbName')

const connections = {}

const connect = async function(mongoURL) {
  connections[mongoURL].connecting = true

  const options = {useNewUrlParser: true}

  const client = await MongoClient.connect(
    mongoURL,
    options
  )

  const dbName = getDbName(mongoURL)
  connections[mongoURL].client = client
  connections[mongoURL].database = client.db(dbName)

  for (const resolve of connections[mongoURL].resolvers) {
    resolve(connections[mongoURL])
  }

  connections[mongoURL].connecting = false
  return connections[mongoURL]
}

module.exports = async function connectToDatabase(mongoURL) {
  if (!mongoURL) {
    throw new Error('Mongo URL env is required')
  }

  connections[mongoURL] = connections[mongoURL] || {
    connecting: false,
    resolvers: [],
    client: null,
    database: null
  }

  if (!connections[mongoURL].connecting) {
    return await connect(mongoURL)
  }

  return new Promise(resolve => connections[mongoURL].resolvers.push(resolve))
}
