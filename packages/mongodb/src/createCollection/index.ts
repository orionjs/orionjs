import {
  BaseCollection,
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
import {deleteUnusedIndexes} from './deleteUnusedIndexes'
import {registerCollection} from './collectionsRegistry'
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

  const baseCollection: Partial<Collection<any>> = {
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

  const encryptedCollection: Partial<Collection<any>> = {
    ...baseCollection,
    getRawCollection: async () => {
      await orionConnection.startConnection()
      return orionConnection.encrypted.db.collection(options.name)
    },
  }

  const mainCollection: Partial<Collection<any>> = {
    ...baseCollection,
    encrypted: encryptedCollection as BaseCollection<ModelClassBase>,
  }

  const defineCollectionProperties = () => {
    if (orionConnection.db) {
      mainCollection.db = orionConnection.db
      mainCollection.rawCollection = orionConnection.db.collection(options.name)
    }

    if (orionConnection.encrypted.db) {
      encryptedCollection.db = orionConnection.encrypted.db
      encryptedCollection.rawCollection = orionConnection.encrypted.db.collection(options.name)
    }
  }

  defineCollectionProperties()

  orionConnection.connectionPromise.then(() => {
    defineCollectionProperties()
    resolveCollectionPromise(orionConnection.client)
  })

  const collections = [mainCollection, encryptedCollection]

  for (const collection of collections) {
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
    collection.createIndexes = async () => []
  }

  const createIndexes = async () => {
    await orionConnection.startConnection()
    const createIndexPromise = loadIndexes(mainCollection)
    createIndexesPromises.push(createIndexPromise)
    mainCollection.createIndexesPromise = createIndexPromise
    return createIndexPromise
  }

  mainCollection.createIndexes = createIndexes
  mainCollection.deleteUnusedIndexes = async () => {
    await orionConnection.startConnection()
    return deleteUnusedIndexes(mainCollection)
  }

  if (!process.env.DONT_CREATE_INDEXES_AUTOMATICALLY) {
    createIndexes()
  }

  wrapMethods(mainCollection as any)
  wrapMethods(encryptedCollection as any)

  // Register collection for deleteAllUnusedIndexes() support
  registerCollection(connectionName, mainCollection as Collection<ModelClassBase>)

  return mainCollection as Collection<ModelClassBase>
}
