import {PropOptions} from '..'
import {PropertyAlreadyExistsError, SchemaAlreadyExistsError} from '../errors'
import {ResolversMap} from '@orion-js/models'
import {Resolver} from '@orion-js/resolvers'

export type PropertiesMap = {[key: string]: PropOptions}
export class MetadataStorageHandler {
  private schemas = new Map<string, object>()
  private properties = new Map<string, PropertiesMap>()
  private resolvers = new Map<string, ResolversMap>()

  public addSchemaMetadata({schemaName, options}: {schemaName: string; options?: object}) {
    if (this.schemas.get(schemaName)) {
      throw new SchemaAlreadyExistsError(schemaName)
    }
    this.schemas.set(schemaName, options)
  }

  public addPropMetadata({
    schemaName,
    propertyKey,
    options
  }: {
    schemaName: string
    propertyKey: string | symbol
    options: PropOptions
  }) {
    let props = this.properties.get(schemaName)
    if (!props) {
      props = {}
    }
    const currProp = props[propertyKey as string]
    if (currProp) {
      throw new PropertyAlreadyExistsError(schemaName, propertyKey as string)
    }
    props[propertyKey as string] = options
    this.properties.set(schemaName, props)
  }

  public addResolverMetadata({
    schemaName,
    propertyKey,
    options
  }: {
    schemaName: string
    propertyKey: string | symbol
    options: Resolver
  }) {
    let resolvers = this.resolvers.get(schemaName)
    if (!resolvers) {
      resolvers = {}
    }
    const currResolver = resolvers[propertyKey as string]
    if (currResolver) {
      throw new PropertyAlreadyExistsError(schemaName, propertyKey as string)
    }
    resolvers[propertyKey as string] = options
    this.resolvers.set(schemaName, resolvers)
  }

  public getSchemaProps(schemaName: string): PropertiesMap | undefined {
    return this.properties.get(schemaName)
  }

  public getSchemaResolvers(schemaName: string): ResolversMap | undefined {
    return this.resolvers.get(schemaName)
  }

  public clearStorage() {
    this.schemas.clear()
    this.properties.clear()
  }
}

export const MetadataStorage: MetadataStorageHandler =
  global.TypedModelMetadataStorage ||
  (global.TypedModelMetadataStorage = new MetadataStorageHandler())
