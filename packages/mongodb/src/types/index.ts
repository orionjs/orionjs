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

export type ModelToDocumentTypeWithId<ModelClass> = DocumentWithId<RemoveFunctions<ModelClass>>
export type ModelToDocumentTypeBase<ModelClass> = RemoveFunctions<ModelClass>
export type ModelToMongoSelector<ModelClass> = MongoSelector<ModelToDocumentTypeWithId<ModelClass>>
export type ModelToUpdateFilter<ModelClass> =
  | MongoDB.UpdateFilter<ModelToDocumentTypeWithId<ModelClass>>
  | Partial<ModelToDocumentTypeWithId<ModelClass>>

export interface CollectionIndex {
  keys: {
    [key: string]: any
  }
  options?: {
    [key: string]: any
  }
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
  ) => Promise<Array<DocumentWithId<ModelClass>>>
  export type LoadOne<ModelClass> = (
    options: LoadOneOptions<ModelClass>
  ) => Promise<DocumentWithId<ModelClass>>
  export type LoadMany<ModelClass> = (
    options: LoadDataOptions<ModelClass>
  ) => Promise<Array<DocumentWithId<ModelClass>>>
  export type LoadById<ModelClass> = (id: string) => Promise<DocumentWithId<ModelClass>>
}

export type MongoSelector<DocumentType = MongoDB.Document> = string | MongoDB.Filter<DocumentType>

export interface FindCursor<ModelClass> extends MongoDB.FindCursor {
  toArray: () => Promise<Array<DocumentWithId<ModelClass>>>
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
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions
) => Promise<DocumentWithId<ModelClass>>

export type Find<ModelClass> = (
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions
) => FindCursor<ModelClass>

export type FindOneAndUpdate<ModelClass> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: ModelToUpdateFilter<ModelClass>,
  options?: FindOneAndUpdateUpdateOptions
) => Promise<DocumentWithId<ModelClass>>

export type InsertOne<ModelClass> = (
  doc: ModelToDocumentTypeBase<ModelClass>,
  options?: InsertOptions
) => Promise<string>

export type InsertMany<ModelClass> = (
  doc: Array<Partial<ModelToDocumentTypeBase<ModelClass>>>,
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
