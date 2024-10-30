import { createNewConnection } from './connections'

module.exports = async function connectToDatabase(mongoURL, mongoOptions) {

  if (!mongoURL) {
    throw new Error('mongoURL is required to connect to the database')
  }

  return createNewConnection(mongoURL, mongoOptions)

}
