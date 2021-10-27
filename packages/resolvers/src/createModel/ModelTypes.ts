import {OrionResolvers} from '../resolver/ResolverTypes'

export namespace OrionModels {
  export interface CreateModelOptions {
    /**
     * The name of the model, used for example for GraphQL
     */
    name: string

    /**
     * Pass a funcion that returns the schema. For example: () => require('./schema').
     * This is used like this to allow circular dependencies
     */
    schema?: any | (() => {default: any})

    /**
     * Pass a funcion that returns the resolvers. For example: () => require('./resolvers')
     * This is used like this to allow circular dependencies
     */
    resolvers?: ResolversMap | (() => {default: ResolversMap})
  }

  export interface ResolversMap {
    [key: string]: OrionResolvers.Resolver
  }

  export interface CloneOptions {
    name: string
    omitFields?: Array<string>
    pickFields?: Array<string>
    mapFields?: (field: any, key: string) => any
    extendSchema?: any
    extendResolvers?: any
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
    getSchema: () => any

    /**
     * Returns the model resolvers
     */
    getResolvers: () => ResolversMap

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
}
