import {OrionMongoClient} from './connections'
import {connectToDB} from './connectToDB'

/**
 * Connects to the main Mongo Database
 */
export const connect = (mongoURL: string): OrionMongoClient => {
  return connectToDB({
    name: 'main',
    uri: mongoURL
  })
}
