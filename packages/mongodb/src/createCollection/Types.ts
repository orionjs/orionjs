import * as MongoDB from 'mongodb'
import {OrionModels} from '@orion-js/models'

type WithId<T> = T & {
  /**
   * The ID of the document
   */
  _id: string
}

export namespace OrionCollection {
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
    ) => Promise<Array<WithId<DocumentType>>>
    export type LoadOne<DocumentType> = (options: LoadOneOptions) => Promise<WithId<DocumentType>>
    export type LoadMany<DocumentType> = (
      options: LoadDataOptions
    ) => Promise<Array<WithId<DocumentType>>>
    export type LoadById<DocumentType> = (id: string) => Promise<WithId<DocumentType>>
  }

  export type MongoSelector<DocumentType = MongoDB.Document> = string | MongoDB.Filter<DocumentType>

  export interface FindCursor<DocumentType> extends MongoDB.FindCursor {
    toArray: () => Promise<Array<WithId<DocumentType>>>
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

  export type InitItem<DocumentType> = (doc: MongoDB.Document) => WithId<DocumentType>

  export type FindOne<DocumentType> = (
    selector: MongoSelector<DocumentType>,
    options?: MongoDB.FindOptions
  ) => Promise<WithId<DocumentType>>

  export type Find<DocumentType> = (
    selector: MongoSelector<DocumentType>,
    options?: MongoDB.FindOptions
  ) => FindCursor<DocumentType>

  export type FindOneAndUpdate<DocumentType> = (
    selector: MongoSelector<DocumentType>,
    modifier: MongoDB.UpdateFilter<DocumentType> | Partial<DocumentType>,
    options?: FindOneAndUpdateUpdateOptions
  ) => Promise<WithId<DocumentType>>

  export type InsertOne<DocumentType> = (
    doc: DocumentType,
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
    model?: OrionModels.Model
    indexes?: Array<CollectionIndex>
  }

  export type CreateCollection = <DocumentType = any>(
    options: CreateCollectionOptions
  ) => Collection<DocumentType>

  export interface Collection<DocumentType = any> {
    name: string
    connectionName?: string
    model?: OrionModels.Model
    indexes?: Array<CollectionIndex>

    db: MongoDB.Db
    rawCollection: MongoDB.Collection
    initItem?: InitItem<DocumentType>

    findOne?: FindOne<DocumentType>
    find?: Find<DocumentType>

    insertOne?: InsertOne<DocumentType>
    insertMany?: InsertMany<DocumentType>

    deleteMany?: DeleteMany<DocumentType>
    deleteOne?: DeleteOne<DocumentType>

    updateOne?: UpdateOne<DocumentType>
    updateMany?: UpdateMany<DocumentType>

    upsert?: Upsert<DocumentType>
    findOneAndUpdate?: FindOneAndUpdate<DocumentType>

    aggregate?: <T = MongoDB.Document>(
      pipeline?: MongoDB.Document[],
      options?: MongoDB.AggregateOptions
    ) => MongoDB.AggregationCursor<T>
    watch?: <T = MongoDB.Document>(
      pipeline?: MongoDB.Document[],
      options?: MongoDB.ChangeStreamOptions
    ) => MongoDB.ChangeStream<T>

    loadData?: DataLoader.LoadData<DocumentType>
    loadOne?: DataLoader.LoadOne<DocumentType>
    loadMany?: DataLoader.LoadMany<DocumentType>
    loadById?: DataLoader.LoadById<DocumentType>
  }
}
