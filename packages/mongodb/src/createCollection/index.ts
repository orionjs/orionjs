import {
  Collection,
  CreateCollectionOptions,
  CreateCollectionOptionsWithSchemaType,
  CreateCollectionOptionsWithTypedSchema,
  InferSchemaTypeWithId,
  ModelClassBase,
  SchemaWithRequiredId,
} from '../types'
import {
  countDocuments,
  deleteMany,
  deleteOne,
  estimatedDocumentCount,
  find,
  findOne,
  findOneAndUpdate,
  insertMany,
  insertOne,
  updateAndFind,
  updateItem,
  updateMany,
  updateOne,
  upsert,
  insertAndFind,
} from './getMethods'
import {loadById, loadOne, loadMany, loadData} from './getMethods/dataLoader'
import getIdGenerator from './generateId'
import {loadIndexes} from './createIndexes'
import {getMongoConnection} from '..'
import {getSchema} from './getSchemaAndModel'
import {wrapMethods} from './wrapMethods'
import {InferSchemaType, TypedSchemaOnSchema} from '@orion-js/schema'
import {MongoClient} from 'mongodb'

export const createIndexesPromises = []

export function createCollection<T extends SchemaWithRequiredId>(
  options: CreateCollectionOptionsWithSchemaType<T>,
): Collection<InferSchemaTypeWithId<T>>

export function createCollection<T extends TypedSchemaOnSchema & {prototype: {_id: string}}>(
  options: CreateCollectionOptionsWithTypedSchema<T>,
): Collection<InferSchemaType<T>>

export function createCollection<T extends ModelClassBase>(
  options: CreateCollectionOptions<T>,
): Collection<T>

export function createCollection(options: CreateCollectionOptions) {
  const connectionName = options.connectionName || 'main'

  const orionConnection = getMongoConnection({name: connectionName})
  if (!orionConnection) {
    throw new Error(`The connection to MongoDB "${connectionName}" was not found`)
  }

  const schema = getSchema(options)

  let resolveCollectionPromise: (MongoClient) => void
  const collectionPromise = new Promise<MongoClient>(resolve => {
    resolveCollectionPromise = resolve
  })

  const collection: Partial<Collection<any>> = {
    name: options.name,
    connectionName,
    schema,
    indexes: options.indexes || [],
    client: orionConnection,
    connectionPromise: collectionPromise,
    startConnection: () => orionConnection.startConnection(),
    generateId: getIdGenerator(options),
    getRawCollection: async () => {
      await orionConnection.startConnection()
      return orionConnection.db.collection(options.name)
    },
    getSchema: () => schema,
  }

  orionConnection.connectionPromise.then(() => {
    collection.db = orionConnection.db
    collection.rawCollection = orionConnection.db.collection(options.name)
    resolveCollectionPromise(orionConnection.client)
  })

  // modified orion methods
  collection.findOne = findOne(collection)
  collection.find = find(collection)
  collection.findOneAndUpdate = findOneAndUpdate(collection)
  collection.insertOne = insertOne(collection)
  collection.insertMany = insertMany(collection)
  collection.insertAndFind = insertAndFind(collection)
  collection.updateOne = updateOne(collection)
  collection.updateMany = updateMany(collection)
  collection.deleteMany = deleteMany(collection)
  collection.deleteOne = deleteOne(collection)
  collection.upsert = upsert(collection)

  // counts
  collection.estimatedDocumentCount = estimatedDocumentCount(collection)
  collection.countDocuments = countDocuments(collection)

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

  const createIndexes = async () => {
    await orionConnection.connectionPromise
    const createIndexPromise = loadIndexes(collection)
    createIndexesPromises.push(createIndexPromise)
    collection.createIndexesPromise = createIndexPromise
    return createIndexPromise
  }

  collection.createIndexes = createIndexes

  if (!process.env.DONT_CREATE_INDEXES_AUTOMATICALLY) {
    createIndexes()
  }

  wrapMethods(collection as any)

  return collection as Collection<ModelClassBase>
}
