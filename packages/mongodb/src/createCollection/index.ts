import {connections} from '../connect/connections'
import initItem from './initItem'
import {OrionCollection} from './Types'
import {
  deleteMany,
  deleteOne,
  find,
  findOne,
  findOneAndUpdate,
  insertMany,
  insertOne,
  updateMany,
  updateOne
} from './getMethods'

export default function createCollection(
  options: OrionCollection.CollectionOptions
): OrionCollection.Collection {
  const connectionName = options.connectionName || 'main'

  const orionConnection = connections[connectionName]
  if (!orionConnection) {
    throw new Error(`The connection to MongoDB "${connectionName}" was not found`)
  }

  const db = orionConnection.db
  const rawCollection = db.collection(options.name)

  const collection: OrionCollection.Collection = {
    name: options.name,
    connectionName,
    model: options.model,
    indexes: options.indexes,
    db,
    rawCollection
  }

  // helpers
  collection.initItem = initItem(collection)

  // modified orion methods
  collection.findOne = findOne(collection)
  collection.find = find(collection)
  collection.findOneAndUpdate = findOneAndUpdate(collection)
  collection.insertOne = insertOne(collection)
  collection.insertMany = insertMany(collection)
  collection.updateOne = updateOne(collection)
  collection.updateMany = updateMany(collection)
  collection.deleteMany = deleteMany(collection)
  collection.deleteOne = deleteOne(collection)

  // plain passed methods
  collection.aggregate = rawCollection.aggregate
  collection.watch = rawCollection.watch

  return collection
}
