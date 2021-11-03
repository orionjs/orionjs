import {connections} from '../connect/connections'
import initItem from './initItem'
import {Collection, CreateCollection, CreateCollectionOptions} from '../types'
import {
  deleteMany,
  deleteOne,
  find,
  findOne,
  findOneAndUpdate,
  insertMany,
  insertOne,
  updateMany,
  updateOne,
  upsert
} from './getMethods'
import {loadById, loadOne, loadMany, loadData} from './getMethods/dataLoader'
import getIdGenerator from './generateId'
import {Model} from '@orion-js/models'

const createCollection: CreateCollection = <DocumentType>(options: CreateCollectionOptions) => {
  const connectionName = options.connectionName || 'main'

  const orionConnection = connections[connectionName]
  if (!orionConnection) {
    throw new Error(`The connection to MongoDB "${connectionName}" was not found`)
  }

  const db = orionConnection.db
  const rawCollection = db.collection(options.name)

  const model: Model =
    options.model && options.model.getModel ? options.model.getModel() : options.model

  const collection: Collection<DocumentType> = {
    name: options.name,
    connectionName,
    model,
    indexes: options.indexes || [],
    db,
    rawCollection,
    generateId: getIdGenerator(options)
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
  collection.upsert = upsert(collection)

  // plain passed methods
  collection.aggregate = (pipeline, options) =>
    collection.rawCollection.aggregate(pipeline, options)
  collection.watch = (pipeline, options) => collection.rawCollection.watch(pipeline, options)

  // data loader
  collection.loadData = loadData(collection)
  collection.loadById = loadById(collection)
  collection.loadOne = loadOne(collection)
  collection.loadMany = loadMany(collection)

  return collection
}

export default createCollection
