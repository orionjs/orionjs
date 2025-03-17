import {PropOptions} from '..'
import {CreateModelOptions, ModelResolversMap} from '@orion-js/models'

export type PropertiesMap = {[key: string]: PropOptions}

interface SchemaStorage {
  schema: any
  options: object
  properties: PropertiesMap
  resolvers: ModelResolversMap
}

export type TypedSchemaOptions = Partial<Omit<CreateModelOptions, 'schema'>>
