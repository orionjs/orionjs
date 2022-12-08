import * as MongoDB from 'mongodb'
import {Model} from '@orion-js/models'
import {Blackbox, Schema} from '@orion-js/schema'
import {OrionMongoClient} from '../connect/connections'

type RemoveFunctions<T extends ModelClassBase> = Pick<
  T,
  {[Key in keyof T]-?: T[Key] extends Function ? never : Key}[keyof T]
> & {_id: ModelClassBase['_id']}

export type ModelClassBase = {
  _id: string
} & Blackbox

export type DocumentWithIdOptional<T extends ModelClassBase> = Omit<T, '_id'> & {
  /**
   * The ID of the document
   */
  _id?: T['_id']
}

export type DocumentWithoutId<T> = Omit<T, '_id'>

export type ModelToDocumentType<ModelClass extends ModelClassBase> = RemoveFunctions<ModelClass>
export type ModelToDocumentTypeWithId<ModelClass extends ModelClassBase> =
  RemoveFunctions<ModelClass>
export type ModelToDocumentTypeWithoutId<ModelClass extends ModelClassBase> = DocumentWithoutId<
  ModelToDocumentType<ModelClass>
>
export type ModelToDocumentTypeWithIdOptional<ModelClass extends ModelClassBase> =
  DocumentWithIdOptional<ModelToDocumentType<ModelClass>>
export type ModelToMongoSelector<ModelClass extends ModelClassBase> = MongoSelector<
  ModelToDocumentType<ModelClass>
>
export type ModelToUpdateFilter<ModelClass extends ModelClassBase> =
  | MongoDB.UpdateFilter<ModelToDocumentTypeWithoutId<ModelClass>>
  | Partial<ModelToDocumentTypeWithoutId<ModelClass>>

export interface CollectionIndex {
  keys: MongoDB.IndexSpecification
  options?: MongoDB.CreateIndexesOptions
}

type KeyOf<T extends object> = Extract<keyof T, string>

export namespace DataLoader {
  interface LoadDataOptionsBase<ModelClass extends ModelClassBase> {
    key: KeyOf<ModelToDocumentTypeWithId<ModelClass>>
    match?: MongoDB.Filter<ModelToDocumentTypeWithId<ModelClass>>
    sort?: MongoDB.Sort
    project?: MongoDB.Document
    timeout?: number
    debug?: boolean
  }

  export interface LoadDataOptions<ModelClass extends ModelClassBase>
    extends LoadDataOptionsBase<ModelClass> {
    value?: any
    values?: Array<any>
  }

  export interface LoadOneOptions<ModelClass extends ModelClassBase>
    extends LoadDataOptionsBase<ModelClass> {
    value: any
  }

  export type LoadData<ModelClass extends ModelClassBase> = (
    options: LoadDataOptions<ModelClass>
  ) => Promise<Array<ModelClass>>
  export type LoadOne<ModelClass extends ModelClassBase> = (
    options: LoadOneOptions<ModelClass>
  ) => Promise<ModelClass>
  export type LoadMany<ModelClass extends ModelClassBase> = (
    options: LoadDataOptions<ModelClass>
  ) => Promise<Array<ModelClass>>
  export type LoadById<ModelClass extends ModelClassBase> = (
    id: ModelClass['_id']
  ) => Promise<ModelClass>
}

export type MongoSelector<ModelClass extends ModelClassBase = ModelClassBase> =
  | ModelClass['_id']
  | MongoDB.Filter<ModelClass>

export interface FindCursor<ModelClass> extends MongoDB.FindCursor {
  toArray: () => Promise<Array<ModelClass>>
}

export interface UpdateOptions {
  clean?: boolean
  validate?: boolean
  mongoOptions?: MongoDB.UpdateOptions
}

export interface FindOneAndUpdateUpdateOptions {
  clean?: boolean
  validate?: boolean
  mongoOptions?: MongoDB.FindOneAndUpdateOptions
}

export interface InsertOptions {
  clean?: boolean
  validate?: boolean
  mongoOptions?: MongoDB.InsertOneOptions
}

export type InitItem<ModelClass extends ModelClassBase> = (doc: any) => ModelClass

export type FindOne<ModelClass extends ModelClassBase> = (
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions
) => Promise<ModelClass>

export type Find<ModelClass extends ModelClassBase> = (
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions
) => FindCursor<ModelClass>

export type FindOneAndUpdate<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: FindOneAndUpdateUpdateOptions
) => Promise<ModelClass>

export type UpdateAndFind<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: FindOneAndUpdateUpdateOptions
) => Promise<ModelClass>

export type UpdateItem<ModelClass extends ModelClassBase> = (
  item: ModelClass,
  modifier: ModelToUpdateFilter<ModelClass>
) => Promise<void>

export type InsertOne<ModelClass extends ModelClassBase> = (
  doc: ModelToDocumentTypeWithIdOptional<ModelClass>,
  options?: InsertOptions
) => Promise<ModelClass['_id']>

export type InsertMany<ModelClass extends ModelClassBase> = (
  doc: Array<ModelToDocumentTypeWithIdOptional<ModelClass>>,
  options?: InsertOptions
) => Promise<Array<ModelClass['_id']>>

export type InsertAndFind<ModelClass extends ModelClassBase> = (
  doc: ModelToDocumentTypeWithIdOptional<ModelClass>,
  options?: InsertOptions
) => Promise<ModelClass>

export type DeleteMany<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.DeleteOptions
) => Promise<MongoDB.DeleteResult>

export type DeleteOne<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.DeleteOptions
) => Promise<MongoDB.DeleteResult>

export type UpdateOne<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult>

export type UpdateMany<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult | MongoDB.Document>

export type Upsert<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult>

export interface CreateCollectionOptions<ModelClass extends ModelClassBase = ModelClassBase> {
  /**
   * The name of the collection on the Mongo Database
   */
  name: string
  /**
   * The name of the connection to use. The Mongo URL of this connection will be search on env variables.
   * If not found, the connection url will be `env.mongo_url`
   * If defined, the connection url will be `env.mongo_url_${name}`
   */
  connectionName?: string
  /**
   * The schema used for cleaning and validation of the documents
   */
  schema?: any
  /**
   * @deprecated Use schema instead. If you use model, all items will be initialized with the model to add resolvers (which are also deprecated)
   */
  model?: any
  /**
   * The indexes to use
   */
  indexes?: Array<CollectionIndex>
  /**
   * Select between random id generation o mongo (time based) id generation
   */
  idGeneration?: 'mongo' | 'random'
  /**
   * ID prefix. Only used if idGeneration is random. Recommended for type checking
   */
  idPrefix?: ModelClass['_id']
}

export type EstimatedDocumentCount<ModelClass extends ModelClassBase> = (
  options?: MongoDB.EstimatedDocumentCountOptions
) => Promise<number>

export type CountDocuments<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.CountDocumentsOptions
) => Promise<number>

export type CreateCollection = <ModelClass extends ModelClassBase = any>(
  options: CreateCollectionOptions<ModelClass>
) => Collection<ModelClass>

export interface Collection<ModelClass extends ModelClassBase = ModelClassBase> {
  name: string
  connectionName?: string
  schema?: Schema
  /**
   * @deprecated Use schema instead. If you use model, all items will be initialized with the model to add resolvers (which are also deprecated)
   */
  model?: Model
  indexes: Array<CollectionIndex>
  generateId: () => ModelClass['_id']
  getSchema: () => Schema

  db: MongoDB.Db
  client: OrionMongoClient
  rawCollection: MongoDB.Collection<ModelClass>
  initItem: InitItem<ModelClass>

  findOne: FindOne<ModelClass>
  find: Find<ModelClass>

  insertOne: InsertOne<ModelClass>
  insertMany: InsertMany<ModelClass>
  insertAndFind: InsertAndFind<ModelClass>

  deleteMany: DeleteMany<ModelClass>
  deleteOne: DeleteOne<ModelClass>

  updateOne: UpdateOne<ModelClass>
  updateMany: UpdateMany<ModelClass>

  upsert: Upsert<ModelClass>
  findOneAndUpdate: FindOneAndUpdate<ModelClass>

  /**
   * Updates a document and returns the updated document with the changes
   */
  updateAndFind: UpdateAndFind<ModelClass>
  updateItem: UpdateItem<ModelClass>

  estimatedDocumentCount: EstimatedDocumentCount<ModelClass>
  countDocuments: CountDocuments<ModelClass>

  aggregate: <T = MongoDB.Document>(
    pipeline?: MongoDB.Document[],
    options?: MongoDB.AggregateOptions
  ) => MongoDB.AggregationCursor<T>
  watch: <T = MongoDB.Document>(
    pipeline?: MongoDB.Document[],
    options?: MongoDB.ChangeStreamOptions
  ) => MongoDB.ChangeStream<T>

  loadData: DataLoader.LoadData<ModelClass>
  loadOne: DataLoader.LoadOne<ModelClass>
  loadMany: DataLoader.LoadMany<ModelClass>
  loadById: DataLoader.LoadById<ModelClass>

  /**
   * Use this function if you are using tests and you pass the
   * env var DONT_CREATE_INDEXES_AUTOMATICALLY and you need to
   * create the indexes for this collection
   */
  createIndexes: () => Promise<string[]>
  createIndexesPromise: Promise<string[]>
  connectionPromise: Promise<MongoDB.MongoClient>
}
