import * as MongoDB from 'mongodb'
import {Model} from '@orion-js/models'

export type DocumentWithId<T> = T & {
  /**
   * The ID of the document
   */
  _id: string
}

type OmitByValue<T, ValueType> = Pick<
  T,
  {[Key in keyof T]-?: T[Key] extends ValueType ? never : Key}[keyof T]
>

type RemoveFunctions<T> = OmitByValue<T, Function>

export type ModelToDocumentType<ModelClass> = RemoveFunctions<ModelClass>
export type ModelToMongoSelector<ModelClass> = MongoSelector<ModelToDocumentType<ModelClass>>

export interface CollectionIndex {
  keys: {
    [key: string]: any
  }
  options: {
    [key: string]: any
  }
}

export namespace DataLoader {
  interface LoadDataOptionsBase {
    key: string
    match?: MongoSelector
    sort?: MongoDB.Sort
    project?: MongoDB.Document
    timeout?: number
    debug?: boolean
  }

  export interface LoadDataOptions extends LoadDataOptionsBase {
    value?: any
    values?: Array<any>
  }

  export interface LoadOneOptions extends LoadDataOptionsBase {
    value: any
  }

  export type LoadData<DocumentType> = (
    options: LoadDataOptions
  ) => Promise<Array<DocumentWithId<DocumentType>>>
  export type LoadOne<DocumentType> = (
    options: LoadOneOptions
  ) => Promise<DocumentWithId<DocumentType>>
  export type LoadMany<DocumentType> = (
    options: LoadDataOptions
  ) => Promise<Array<DocumentWithId<DocumentType>>>
  export type LoadById<DocumentType> = (id: string) => Promise<DocumentWithId<DocumentType>>
}

export type MongoSelector<DocumentType = MongoDB.Document> = string | MongoDB.Filter<DocumentType>

export interface FindCursor<DocumentType> extends MongoDB.FindCursor {
  toArray: () => Promise<Array<DocumentWithId<DocumentType>>>
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

export type InitItem<ModelClass> = (doc: MongoDB.Document) => DocumentWithId<ModelClass>

export type FindOne<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions
) => Promise<DocumentWithId<ModelClass>>

export type Find<DocumentType> = (
  selector: MongoSelector<DocumentType>,
  options?: MongoDB.FindOptions
) => FindCursor<DocumentType>

export type FindOneAndUpdate<DocumentType> = (
  selector: MongoSelector<DocumentType>,
  modifier: MongoDB.UpdateFilter<DocumentType> | Partial<DocumentType>,
  options?: FindOneAndUpdateUpdateOptions
) => Promise<DocumentWithId<DocumentType>>

export type InsertOne<ModelClass> = (
  doc: ModelToDocumentType<ModelClass>,
  options?: InsertOptions
) => Promise<string>

export type InsertMany<DocumentType> = (
  doc: Array<Partial<DocumentType>>,
  options?: InsertOptions
) => Promise<Array<string>>

export type DeleteMany<DocumentType> = (
  selector: MongoSelector<DocumentType>,
  options?: MongoDB.DeleteOptions
) => Promise<MongoDB.DeleteResult>

export type DeleteOne<DocumentType> = (
  selector: MongoSelector<DocumentType>,
  options?: MongoDB.DeleteOptions
) => Promise<MongoDB.DeleteResult>

export type UpdateOne<DocumentType> = (
  selector: MongoSelector<DocumentType>,
  modifier: MongoDB.UpdateFilter<DocumentType> | Partial<DocumentType>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult>

export type UpdateMany<DocumentType> = (
  selector: MongoSelector<DocumentType>,
  modifier: MongoDB.UpdateFilter<DocumentType> | Partial<DocumentType>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult | MongoDB.Document>

export type Upsert<DocumentType> = (
  selector: MongoSelector<DocumentType>,
  modifier: MongoDB.UpdateFilter<DocumentType> | Partial<DocumentType>,
  options?: UpdateOptions
) => Promise<MongoDB.UpdateResult>

export interface CreateCollectionOptions {
  name: string
  connectionName?: string
  model?: Model
  indexes?: Array<CollectionIndex>
  idGeneration?: 'mongo' | 'random'
}

export type CreateCollection = <ModelClass = any>(
  options: CreateCollectionOptions
) => Collection<ModelClass>

export interface Collection<ModelClass = any> {
  name: string
  connectionName?: string
  model?: Model
  indexes: Array<CollectionIndex>
  generateId: () => string

  db: MongoDB.Db
  rawCollection: MongoDB.Collection
  initItem?: InitItem<ModelClass>

  findOne?: FindOne<ModelClass>
  find?: Find<ModelClass>

  insertOne?: InsertOne<ModelClass>
  insertMany?: InsertMany<ModelClass>

  deleteMany?: DeleteMany<ModelClass>
  deleteOne?: DeleteOne<ModelClass>

  updateOne?: UpdateOne<ModelClass>
  updateMany?: UpdateMany<ModelClass>

  upsert?: Upsert<ModelClass>
  findOneAndUpdate?: FindOneAndUpdate<ModelClass>

  aggregate?: <T = MongoDB.Document>(
    pipeline?: MongoDB.Document[],
    options?: MongoDB.AggregateOptions
  ) => MongoDB.AggregationCursor<T>
  watch?: <T = MongoDB.Document>(
    pipeline?: MongoDB.Document[],
    options?: MongoDB.ChangeStreamOptions
  ) => MongoDB.ChangeStream<T>

  loadData?: DataLoader.LoadData<ModelClass>
  loadOne?: DataLoader.LoadOne<ModelClass>
  loadMany?: DataLoader.LoadMany<ModelClass>
  loadById?: DataLoader.LoadById<ModelClass>
}
