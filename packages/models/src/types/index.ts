import {
  GlobalResolverResolve,
  ModelResolver,
  ModelResolverResolve,
  Resolver
} from '@orion-js/resolvers'
import {Schema, SchemaMetaFieldType, SchemaNode} from '@orion-js/schema'

export interface ModelsSchemaNode extends Omit<SchemaNode, 'type'> {
  type: Model | [Model] | SchemaMetaFieldType
}

export interface ModelSchema {
  [key: string]: ModelsSchemaNode
}

export interface CreateModelOptions {
  /**
   * The name of the model, used for example for GraphQL
   */
  name: string

  /**
   * Pass a function that returns the schema. For example: () => require('./schema').
   * This is used like this to allow circular dependencies
   */
  schema?: ModelSchema | (() => {default: ModelSchema})

  /**
   * Pass a function that returns the resolvers. For example: () => require('./resolvers')
   * This is used like this to allow circular dependencies
   */
  resolvers?: ModelResolversMap | (() => {default: ModelResolversMap})

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
  [key: string]: ModelResolver<ModelResolverResolve>
}

export interface GlobalResolversMap {
  [key: string]: Resolver<GlobalResolverResolve>
}

export interface CloneOptions {
  name: string
  omitFields?: string[]
  pickFields?: string[]
  mapFields?: (field: any, key: string) => any
  extendSchema?: Schema
  extendResolvers?: ModelResolversMap
}

export interface Model {
  __isModel: boolean

  /**
   * The name of the model, used for example for GraphQL
   */
  name: string

  /**
   * Returns the schema of the model
   */
  getSchema: () => Schema & {__model: Model}

  /**
   * Returns the schema without adding __model to the schema
   */
  getCleanSchema: () => Schema

  /**
   * Returns the model resolvers
   */
  getResolvers: () => ModelResolversMap

  /**
   * Adds the model resolvers to a item
   */
  initItem: (item: any) => any

  /**
   * Validates an item using @orion-js/schema
   */
  validate: (item: any) => Promise<any>

  /**
   * Cleans an item using @orion-js/schema
   */
  clean: (item: any) => Promise<any>

  /**
   * Creates a new model using this one as a base
   */
  clone: (cloneOptions: CloneOptions) => Model
}

export type CreateModel = (options: CreateModelOptions) => Model
