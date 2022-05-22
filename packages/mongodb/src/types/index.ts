import * as MongoDB from 'mongodb'
import {Model} from '@orion-js/models'
import {Schema} from '@orion-js/schema'
import {OrionMongoClient} from '../connect/connections'

type RemoveFunctions<T> = OmitByValue<T, Function>

export type DocumentWithId<T> = T & {
  /**
   * The ID of the document
   */
  _id: string
}

export type DocumentWithIdOptional<T> = Omit<T, '_id'> & {
  /**
   * The ID of the document
   */
  _id?: string
}

export type DocumentWithoutId<T> = Omit<T, '_id'>

type OmitByValue<T, ValueType> = Pick<
  T,
  {[Key in keyof T]-?: T[Key] extends ValueType ? never : Key}[keyof T]
>

export type ModelToDocumentType<ModelClass> = RemoveFunctions<ModelClass>
export type ModelToDocumentTypeWithId<ModelClass> = DocumentWithId<RemoveFunctions<ModelClass>>
export type ModelToDocumentTypeWithoutId<ModelClass> = DocumentWithoutId<
  ModelToDocumentType<ModelClass>
>
export type ModelToDocumentTypeWithIdOptional<ModelClass> = DocumentWithIdOptional<
  ModelToDocumentType<ModelClass>
>
export type ModelToMongoSelector<ModelClass> = MongoSelector<ModelToDocumentType<ModelClass>>
export type ModelToUpdateFilter<ModelClass> =
  | MongoDB.UpdateFilter<ModelToDocumentTypeWithoutId<ModelClass>>
  | Partial<ModelToDocumentTypeWithoutId<ModelClass>>

export interface CollectionIndex {
  keys: MongoDB.IndexSpecification
  options?: MongoDB.CreateIndexesOptions
}

type KeyOf<T extends object> = Extract<keyof T, string>

export namespace DataLoader {
  interface LoadDataOptionsBase<ModelClass> {
    key: KeyOf<ModelToDocumentTypeWithId<ModelClass>>
    match?: MongoDB.Filter<ModelToDocumentTypeWithId<ModelClass>>
    sort?: MongoDB.Sort
    project?: MongoDB.Document
    timeout?: number
    debug?: boolean
  }

  export interface LoadDataOptions<ModelClass> extends LoadDataOptionsBase<ModelClass> {
    value?: any
    values?: Array<any>
  }

  export interface LoadOneOptions<ModelClass> extends LoadDataOptionsBase<ModelClass> {
    value: any
  }

  export type LoadData<ModelClass> = (
    options: LoadDataOptions<ModelClass>
  ) => Promise<Array<ModelClass>>
  export type LoadOne<ModelClass> = (options: LoadOneOptions<ModelClass>) => Promise<ModelClass>
  export type LoadMany<ModelClass> = (
    options: LoadDataOptions<ModelClass>
  ) => Promise<Array<ModelClass>>
  export type LoadById<ModelClass> = (id: string) => Promise<ModelClass>
}

export type MongoSelector<DocumentType = MongoDB.Document> = string | MongoDB.Filter<DocumentType>

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

export type InitItem<ModelClass> = (doc: MongoDB.Document) => ModelClass

export type FindOne<ModelClass> = (
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions
) => Promise<ModelClass>

export type Find<ModelClass> = (
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions
) => FindCursor<ModelClass>

export type FindOneAndUpdate<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: FindOneAndUpdateUpdateOptions
) => Promise<ModelClass>

export type UpdateAndFind<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: FindOneAndUpdateUpdateOptions
) => Promise<ModelClass>

export type UpdateItem<ModelClass> = (
  item: {_id: string} & ModelClass,
  modifier: ModelToUpdateFilter<ModelClass>
) => Promise<void>

export type InsertOne<ModelClass> = (
  doc: ModelToDocumentTypeWithIdOptional<ModelClass>,
  options?: InsertOptions
) => Promise<string>

export type InsertMany<ModelClass> = (
  doc: Array<ModelToDocumentTypeWithIdOptional<ModelClass>>,
  options?: InsertOptions
) => Promise<Array<string>>

export type DeleteMany<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.DeleteOptions
) => Promise<MongoDB.DeleteResult>

export type DeleteOne<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.DeleteOptions
) => Promise<MongoDB.DeleteResult>

export type UpdateOne<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult>

export type UpdateMany<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult | MongoDB.Document>

export type Upsert<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult>

export interface CreateCollectionOptions {
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
}

export type EstimatedDocumentCount<ModelClass> = (
  options?: MongoDB.EstimatedDocumentCountOptions
) => Promise<number>

export type CountDocuments<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.CountDocumentsOptions
) => Promise<number>

export type CreateCollection = <ModelClass = any>(
  options: CreateCollectionOptions
) => Collection<ModelClass>

export interface Collection<ModelClass = any> {
  name: string
  connectionName?: string
  schema?: Schema
  /**
   * @deprecated Use schema instead. If you use model, all items will be initialized with the model to add resolvers (which are also deprecated)
   */
  model?: Model
  indexes: Array<CollectionIndex>
  generateId: () => string
  getSchema: () => Schema

  db: MongoDB.Db
  client: OrionMongoClient
  rawCollection: MongoDB.Collection
  initItem: InitItem<ModelClass>

  findOne: FindOne<ModelClass>
  find: Find<ModelClass>

  insertOne: InsertOne<ModelClass>
  insertMany: InsertMany<ModelClass>

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
