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
    model?: any
    indexes: Array<CollectionIndex>
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
  }

  export interface InsertOptions {
    clean?: boolean
    validate?: boolean
  }

  export type InitItem = (doc: MongoDB.Document) => Document

  export type FindOne = (selector: MongoSelector, options: MongoDB.FindOptions) => Promise<Document>

  export type Find = (selector: MongoSelector, options: MongoDB.FindOptions) => FindCursor

  export type FindOneAndUpdate = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document>,
    options: UpdateOptions
  ) => Promise<Document>

  export type InsertOne = (doc: Document, options: InsertOptions) => Promise<string>

  export type InsertMany = (doc: Array<Document>, options: InsertOptions) => Promise<Array<string>>

  export type DeleteMany = (
    selector: MongoSelector,
    options: MongoDB.DeleteOptions
  ) => Promise<MongoDB.DeleteResult>

  export type DeleteOne = (
    selector: MongoSelector,
    options: MongoDB.DeleteOptions
  ) => Promise<MongoDB.DeleteResult>

  export type UpdateOne = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document>,
    options: UpdateOptions
  ) => Promise<MongoDB.UpdateResult>

  export type UpdateMany = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document>,
    options: UpdateOptions
  ) => Promise<MongoDB.UpdateResult | MongoDB.Document>

  export type Upsert = (
    selector: MongoSelector,
    modifier: MongoDB.UpdateFilter<MongoDB.Document>,
    options: UpdateOptions
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
    findOneAndUpdate?: FindOneAndUpdate

    aggregate?: <T = MongoDB.Document>(
      pipeline?: MongoDB.Document[],
      options?: MongoDB.AggregateOptions
    ) => MongoDB.AggregationCursor<T>
    watch?: <T = MongoDB.Document>(
      pipeline?: MongoDB.Document[],
      options?: MongoDB.ChangeStreamOptions
    ) => MongoDB.ChangeStream<T>
  }
}
