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
  updateAndFind,
  updateItem,
  updateMany,
  updateOne,
  upsert
} from './getMethods'
import {loadById, loadOne, loadMany, loadData} from './getMethods/dataLoader'
import getIdGenerator from './generateId'
import {Model} from '@orion-js/models'
import {loadIndexes} from './createIndexes'
import {cloneDeep} from 'lodash'
import {getMongoConnection} from '..'

export const createIndexesPromises = []

const createCollection: CreateCollection = <DocumentType>(options: CreateCollectionOptions) => {
  const connectionName = options.connectionName || 'main'

  const orionConnection = getMongoConnection({name: connectionName})
  if (!orionConnection) {
    throw new Error(`The connection to MongoDB "${connectionName}" was not found`)
  }

  const db = orionConnection.db
  const rawCollection = db.collection(options.name)

  const model: Model =
    options.model && options.model.getModel ? options.model.getModel() : options.model

  const collection: Partial<Collection<DocumentType>> = {
    name: options.name,
    connectionName,
    model,
    indexes: options.indexes || [],
    db,
    client: orionConnection,
    connectionPromise: orionConnection.connectionPromise,
    rawCollection,
    generateId: getIdGenerator(options),
    getSchema: () => {
      const schema = cloneDeep(model.getCleanSchema())
      if (!schema._id) {
        schema._id = {
          type: 'ID'
        }
      }
      return schema
    }
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

  // update and find
  collection.updateAndFind = updateAndFind(collection)
  collection.updateItem = updateItem(collection)

  // plain passed methods
  collection.aggregate = (pipeline, options) =>
    collection.rawCollection.aggregate(pipeline, options)
  collection.watch = (pipeline, options) => collection.rawCollection.watch(pipeline, options)

  // data loader
  collection.loadData = loadData(collection)
  collection.loadById = loadById(collection)
  collection.loadOne = loadOne(collection)
  collection.loadMany = loadMany(collection)

  const createIndexPromise = loadIndexes(collection)
  createIndexesPromises.push(createIndexPromise)
  collection.createIndexesPromise = createIndexPromise

  return collection as Collection<DocumentType>
}

export default createCollection
