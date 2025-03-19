import * as MongoDB from 'mongodb'
import {
  FieldType,
  fieldTypes,
  InferSchemaType,
  Schema,
  SchemaInAnyOrionForm,
  StrictInferSchemaType,
  TypedSchemaOnSchema,
} from '@orion-js/schema'
import {OrionMongoClient} from '../connect/connections'
import {EnhancedOmit} from 'mongodb'

export {MongoDB}

export type OptionalId<T> = MongoDB.OptionalId<T>

export declare type InferIdType<TSchema> = TSchema extends {
  _id: infer IdType
}
  ? Record<any, never> extends IdType
    ? never
    : IdType
  : TSchema extends {
        _id?: infer IdType
      }
    ? unknown extends IdType
      ? string
      : IdType
    : string

export type DocumentWithId<TSchema> = EnhancedOmit<TSchema, '_id'> & {
  _id: InferIdType<TSchema>
}

export type ModelClassBase = DocumentWithId<MongoDB.Document>

export interface CollectionIndex {
  keys: MongoDB.IndexSpecification
  options?: MongoDB.CreateIndexesOptions
}

export namespace DataLoader {
  interface LoadDataOptionsBase<ModelClass extends ModelClassBase> {
    key: keyof ModelClass
    match?: MongoFilter<ModelClass>
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
    options: LoadDataOptions<ModelClass>,
  ) => Promise<Array<ModelClass>>
  export type LoadOne<ModelClass extends ModelClassBase> = (
    options: LoadOneOptions<ModelClass>,
  ) => Promise<ModelClass>
  export type LoadMany<ModelClass extends ModelClassBase> = (
    options: LoadDataOptions<ModelClass>,
  ) => Promise<Array<ModelClass>>
  export type LoadById<ModelClass extends ModelClassBase> = (
    id: ModelClass['_id'],
  ) => Promise<ModelClass>
}

export type MongoFilter<ModelClass extends ModelClassBase = ModelClassBase> =
  MongoDB.Filter<ModelClass>

export type MongoSelector<ModelClass extends ModelClassBase = ModelClassBase> =
  | ModelClass['_id']
  | MongoFilter<ModelClass>

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

export type ModelToMongoSelector<ModelClass extends ModelClassBase> =
  | MongoDB.Filter<ModelClass>
  | DocumentWithId<ModelClass>['_id']

export type FindOne<ModelClass extends ModelClassBase> = (
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions<ModelClass>,
) => Promise<ModelClass>

export type Find<ModelClass extends ModelClassBase> = (
  selector?: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.FindOptions<ModelClass>,
) => FindCursor<ModelClass>

export type FindOneAndUpdate<ModelClass extends ModelClassBase> = <
  TSelector extends ModelToMongoSelector<ModelClass>,
  TFilter extends MongoDB.UpdateFilter<ModelClass>,
  TOptions extends FindOneAndUpdateUpdateOptions,
>(
  selector: TSelector,
  modifier: TFilter,
  options?: TOptions,
) => ReturnType<MongoDB.Collection<ModelClass>['findOneAndUpdate']>

export type UpdateAndFind<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: MongoDB.UpdateFilter<ModelClass>,
  options?: FindOneAndUpdateUpdateOptions,
) => Promise<ModelClass>

export type UpdateItem<ModelClass extends ModelClassBase> = (
  item: ModelClass,
  modifier: MongoDB.UpdateFilter<ModelClass>,
  options?: FindOneAndUpdateUpdateOptions,
) => Promise<void>

export type InsertOne<ModelClass extends ModelClassBase> = (
  doc: MongoDB.OptionalId<ModelClass>,
  options?: InsertOptions,
) => Promise<ModelClass['_id']>

export type InsertMany<ModelClass extends ModelClassBase> = (
  doc: Array<MongoDB.OptionalId<ModelClass>>,
  options?: InsertOptions,
) => Promise<Array<ModelClass['_id']>>

export type InsertAndFind<ModelClass extends ModelClassBase> = (
  doc: MongoDB.OptionalId<ModelClass>,
  options?: InsertOptions,
) => Promise<ModelClass>

export type DeleteMany<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.DeleteOptions,
) => Promise<MongoDB.DeleteResult>

export type DeleteOne<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.DeleteOptions,
) => Promise<MongoDB.DeleteResult>

export type UpdateOne<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: MongoDB.UpdateFilter<ModelClass>,
  options?: UpdateOptions,
) => Promise<MongoDB.UpdateResult>

export type UpdateMany<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: MongoDB.UpdateFilter<ModelClass>,
  options?: UpdateOptions,
) => Promise<MongoDB.UpdateResult | MongoDB.Document>

export type Upsert<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  modifier: MongoDB.UpdateFilter<ModelClass>,
  options?: UpdateOptions,
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
  schema?: SchemaInAnyOrionForm
  /**
   * The indexes to use
   */
  indexes?: Array<CollectionIndex>
  /**
   * Select between random id generation o mongo (time based) id generation
   */
  idGeneration?: 'mongo' | 'random' | 'uuid'
  /**
   * ID prefix. idGeneration will be forced to random. Recommended for type checking
   */
  idPrefix?: ModelClass['_id']
}

export type EstimatedDocumentCount<_ModelClass extends ModelClassBase> = (
  options?: MongoDB.EstimatedDocumentCountOptions,
) => Promise<number>

export type CountDocuments<ModelClass extends ModelClassBase> = (
  selector: ModelToMongoSelector<ModelClass>,
  options?: MongoDB.CountDocumentsOptions,
) => Promise<number>

export type SchemaWithRequiredId = Schema & {_id: {type: any}}

export type InferSchemaTypeWithId<TSchema extends SchemaWithRequiredId> = DocumentWithId<
  StrictInferSchemaType<TSchema>
>

export type CreateCollectionOptionsWithSchemaType<T extends SchemaWithRequiredId> = {
  schema: T
} & Omit<CreateCollectionOptions<InferSchemaTypeWithId<T>>, 'schema'>

export type CreateCollectionOptionsWithTypedSchema<
  T extends TypedSchemaOnSchema & {prototype: {_id: string}},
> = {
  schema: T
} & Omit<CreateCollectionOptions<InferSchemaType<T>>, 'schema'>

export class Collection<ModelClass extends ModelClassBase = ModelClassBase> {
  name: string
  connectionName?: string
  schema?: Schema
  indexes: Array<CollectionIndex>
  generateId: () => ModelClass['_id']
  getSchema: () => Schema

  db: MongoDB.Db
  client: OrionMongoClient
  rawCollection: MongoDB.Collection<ModelClass>

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
    options?: MongoDB.AggregateOptions,
  ) => MongoDB.AggregationCursor<T>
  watch: <T = MongoDB.Document>(
    pipeline?: MongoDB.Document[],
    options?: MongoDB.ChangeStreamOptions,
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
  startConnection: () => Promise<MongoDB.MongoClient>
}

export type DistinctDocumentId<DistinctId extends string> = string & {
  __TYPE__: `DistinctDocumentId<${DistinctId}>`
}

export type TypedId<TPrefix extends string> = `${TPrefix}-${string}`

/**
 * Use this function to create unique types for the ids of mongodb documents.
 * You should set it as the type of the _id field in your schema.
 *
 * @example
 * ```ts
 * type UserId = TypedId<'user'>
 *
 * const userSchema = {
 *   _id: {
 *     type: TypedId('user'),
 *   },
 * }
 *
 * ```
 */
export function typedId<const TPrefix extends string>(
  prefix: TPrefix,
): FieldType<TypedId<TPrefix>> {
  return {
    ...fieldTypes.string,
    name: `typedId:${prefix}`,
  } as any
}
