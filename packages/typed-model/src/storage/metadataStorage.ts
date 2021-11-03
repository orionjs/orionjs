import {PropOptions} from '..'
import {PropertyAlreadyExistsError} from '../errors'
import {ResolversMap} from '@orion-js/models'
import {Resolver} from '@orion-js/resolvers'
import {generateId} from '@orion-js/helpers'

export type PropertiesMap = {[key: string]: PropOptions}

interface SchemaStorage {
  schema: Function
  options: object
  properties: PropertiesMap
  resolvers: ResolversMap
}

export class MetadataStorageHandler {
  private schemas = new Map<Function, SchemaStorage>()

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

  public addSchemaMetadata({target, options}: {target: Function; options?: object}) {
    const schema = this.getSchema(target)
    schema.options = options
  }

  public addPropMetadata({
    target,
    propertyKey,
    options
  }: {
    target: Function
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
    target: Function
    propertyKey: string
    options: Resolver
  }) {
    const schema = this.getSchema(target)

    const currResolver = schema.resolvers[propertyKey]
    if (currResolver) {
      throw new PropertyAlreadyExistsError(target.name, propertyKey)
    }
    schema.resolvers[propertyKey] = options
  }

  public getSchemaProps(target: Function): PropertiesMap | undefined {
    const schema = this.getSchema(target)

    return schema.properties
  }

  public getSchemaResolvers(target: Function): ResolversMap | undefined {
    const schema = this.getSchema(target)

    return schema.resolvers
  }
}

export const MetadataStorage = new MetadataStorageHandler()
