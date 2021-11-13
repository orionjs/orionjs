import {OrionMongoClient} from './connections'
import {connectToDB} from './connectToDB'

/**
 * Connects to the main Mongo Database
 */
export const connect = (mongoURL: string, connectionName = 'main'): OrionMongoClient => {
  return connectToDB({
    name: connectionName,
    uri: mongoURL
  })
}
