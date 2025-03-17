import {GlobalResolver, ModelResolver} from '@orion-js/resolvers'
import {Schema, SchemaFieldType, SchemaNode} from '@orion-js/schema'

export interface ModelsSchemaNode extends Omit<SchemaNode, 'type'> {
  type: Model | [Model] | SchemaFieldType
}

export interface ModelSchema {
  [key: string]: ModelsSchemaNode
}

export interface CreateModelOptions<TSchema extends Schema = any> {
  /**
   * The name of the model, used for example for GraphQL
   */
  name: string

  /**
   * Pass a function that returns the schema. For example: () => require('./schema').
   * This is used like this to allow circular dependencies
   */
  schema?: TSchema

  /**
   * Pass a function that returns the resolvers. For example: () => require('./resolvers')
   * This is used like this to allow circular dependencies
   */
  resolvers?: ModelResolversMap

  /**
   * Optional function that will process the document before being returned.
   * @param doc The current document
   * @return The processed document promise
   */
  clean?: (doc: any) => Promise<any> | any

  /**
   * Optional function that will validate the document before being returned.
   * @param doc The current document
   */
  validate?: (doc: any) => Promise<void> | void
}

export interface ModelResolversMap {
  [key: string]: ModelResolver
}

export interface GlobalResolversMap {
  [key: string]: GlobalResolver
}

export interface CloneOptions {
  name: string
  omitFields?: string[]
  pickFields?: string[]
  mapFields?: (field: any, key: string) => any
  extendSchema?: Schema
  extendResolvers?: ModelResolversMap
}

export interface Model<TSchema = any> {
  __isModel: true
  __modelName: string
  /**
   * The name of the model, used for example for GraphQL
   */
  name: string

  /**
   * Returns the schema of the model
   */
  getSchema: () => Schema

  /**
   * Returns the model resolvers
   */
  getResolvers: () => ModelResolversMap

  /**
   * Validates an item using @orion-js/schema
   */
  validate: (item: any) => Promise<any>

  /**
   * Cleans an item using @orion-js/schema
   */
  clean: (item: any) => Promise<TSchema>

  /**
   * Cleans and validates an item using @orion-js/schema
   */
  cleanAndValidate: (item: any) => Promise<TSchema>

  /**
   * Creates a new model using this one as a base
   */
  clone: (cloneOptions: CloneOptions) => Model

  /**
   * The type of the model. Only use this in typescript
   */
  type: TSchema
}

export type CreateModel<TSchema = any> = (options: CreateModelOptions) => Model<TSchema>
