import {PropOptions} from '..'
import {PropertyAlreadyExistsError} from '../errors'
import {ModelResolversMap} from '@orion-js/models'
import {ModelResolver, ModelResolverResolve} from '@orion-js/resolvers'
import {generateId} from '@orion-js/helpers'

export type PropertiesMap = {[key: string]: PropOptions}

interface SchemaStorage {
  schema: any
  options: object
  properties: PropertiesMap
  resolvers: ModelResolversMap
}

export type TypedModelOptions = Record<string, never>

export class MetadataStorageHandler {
  private schemas = new Map<any, SchemaStorage>()

  private getSchema(target) {
    const schema = this.schemas.get(target.__schemaId)
    if (schema) return schema

    const schemaId = generateId()

    target.__schemaId = schemaId

    const newSchema = {
      schema: target,
      options: {},
      properties: {},
      resolvers: {}
    }
    this.schemas.set(target.__schemaId, newSchema)
    return newSchema
  }

  public addSchemaMetadata({target, options}: {target: any; options?: TypedModelOptions}) {
    const schema = this.getSchema(target)
    schema.options = options
  }

  public addPropMetadata({
    target,
    propertyKey,
    options
  }: {
    target: any
    propertyKey: string
    options: PropOptions
  }) {
    const schema = this.getSchema(target)

    const currProp = schema.properties[propertyKey]
    if (currProp) {
      throw new PropertyAlreadyExistsError(target.name, propertyKey)
    }
    schema.properties[propertyKey] = options
  }

  public addResolverMetadata({
    target,
    propertyKey,
    options
  }: {
    target: any
    propertyKey: string
    options: ModelResolver<ModelResolverResolve>
  }) {
    const schema = this.getSchema(target)

    const currResolver = schema.resolvers[propertyKey]
    if (currResolver) {
      throw new PropertyAlreadyExistsError(target.name, propertyKey)
    }
    schema.resolvers[propertyKey] = options
  }

  public getSchemaProps(target: any): PropertiesMap | undefined {
    const schema = this.getSchema(target)

    return schema.properties
  }

  public getSchemaResolvers(target: any): ModelResolversMap | undefined {
    const schema = this.getSchema(target)

    return schema.resolvers
  }
}

export const MetadataStorage = new MetadataStorageHandler()
