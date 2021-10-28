import {OrionModels} from '@orion-js/resolvers/lib/createModel/ModelTypes'
import * as MongoDB from 'mongodb'

export namespace OrionCollection {
  export interface CollectionIndex {
    keys: {
      [key: string]: any
    }
    options: {
      [key: string]: any
    }
  }
  export interface CollectionOptions {
    name: string
    connectionName?: string
    model?: OrionModels.Model
    indexes?: Array<CollectionIndex>
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

    export type LoadData = (options: LoadDataOptions) => Promise<Array<any>>
    export type LoadOne = (options: LoadOneOptions) => Promise<any>
    export type LoadMany = (options: LoadDataOptions) => Promise<Array<any>>
    export type LoadById = (id: string) => Promise<any>
  }

  export type MongoSelector = string | MongoDB.Filter<MongoDB.Document>

  export interface Document {
    [key: string]: any
  }

  export interface FindCursor extends MongoDB.FindCursor {
    toArray: () => Promise<Array<Document>>
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

  export type InitItem = (doc: MongoDB.Document) => Document

  export type FindOne = (
    selector: MongoSelector,
    options?: MongoDB.FindOptions
  ) => Promise<Document>

  export type Find = (selector: MongoSelector, options?: MongoDB.FindOptions) => FindCursor

  export type FindOneAndUpdate = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document> | Partial<MongoDB.Document>,
    options?: FindOneAndUpdateUpdateOptions
  ) => Promise<Document>

  export type InsertOne = (doc: Document, options?: InsertOptions) => Promise<string>

  export type InsertMany = (doc: Array<Document>, options?: InsertOptions) => Promise<Array<string>>

  export type DeleteMany = (
    selector: MongoSelector,
    options?: MongoDB.DeleteOptions
  ) => Promise<MongoDB.DeleteResult>

  export type DeleteOne = (
    selector: MongoSelector,
    options?: MongoDB.DeleteOptions
  ) => Promise<MongoDB.DeleteResult>

  export type UpdateOne = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document> | Partial<MongoDB.Document>,
    options?: UpdateOptions
  ) => Promise<MongoDB.UpdateResult>

  export type UpdateMany = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document> | Partial<MongoDB.Document>,
    options?: UpdateOptions
  ) => Promise<MongoDB.UpdateResult | MongoDB.Document>

  export type Upsert = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document> | Partial<MongoDB.Document>,
    options?: UpdateOptions
  ) => Promise<MongoDB.UpdateResult>

  export interface Collection extends CollectionOptions {
    db: MongoDB.Db
    rawCollection: MongoDB.Collection
    initItem?: InitItem

    findOne?: FindOne
    find?: Find

    insertOne?: InsertOne
    insertMany?: InsertMany

    deleteMany?: DeleteMany
    deleteOne?: DeleteOne

    updateOne?: UpdateOne
    updateMany?: UpdateMany

    upsert?: Upsert
    findOneAndUpdate?: FindOneAndUpdate

    aggregate?: <T = MongoDB.Document>(
      pipeline?: MongoDB.Document[],
      options?: MongoDB.AggregateOptions
    ) => MongoDB.AggregationCursor<T>
    watch?: <T = MongoDB.Document>(
      pipeline?: MongoDB.Document[],
      options?: MongoDB.ChangeStreamOptions
    ) => MongoDB.ChangeStream<T>

    loadData?: DataLoader.LoadData
    loadOne?: DataLoader.LoadOne
    loadMany?: DataLoader.LoadMany
    loadById?: DataLoader.LoadById
  }
}
