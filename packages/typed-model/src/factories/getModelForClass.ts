/* eslint-disable @typescript-eslint/ban-types */
import {createModel, Model, ModelSchema, ModelResolversMap} from '@orion-js/models'
import {FieldType} from '@orion-js/schema/lib/fieldType'
import {PropOptions} from '..'
import {MetadataStorage} from '../storage/metadataStorage'
import {Constructor} from '../utils/interfaces'
import {processSchemaForProp} from './helpers/processSchemaForProp'

const modelCache = new Map<Constructor<any>, Model>()

function processModelSchemaForProp(prop: PropOptions) {
  if ((prop.type as Model)?.__isModel === true) {
    return prop
  }

  if ((prop.type as FieldType)?._isFieldType === true) {
    return prop
  }

  return processSchemaForProp(prop)
}

export function getModelForClass<TClass>(target: Constructor<TClass>): Model {
  const targetAsModel = target as any as Model
  if (targetAsModel.__isModel) {
    return targetAsModel
  }

  let modelResolvers = null

  if (target.prototype.typedModel) {
    modelResolvers = target.prototype.resolvers || {}
    target = target.prototype.typedModel
  }

  const schemaId = (target as any).__schemaId

  if (modelCache.has(schemaId)) {
    return modelCache.get(schemaId)
  }

  const schema: ModelSchema = {}
  const resolverMap: ModelResolversMap = {}

  let parent: Function = target

  while (parent.prototype) {
    if (parent === Function.prototype) {
      break
    }

    const props = MetadataStorage.getSchemaProps(parent) ?? {}

    Object.keys(props).forEach(key => {
      schema[key] = processModelSchemaForProp(props[key])
    })

    const resolvers = MetadataStorage.getSchemaResolvers(parent) ?? {}
    Object.keys(resolvers).forEach(key => {
      resolverMap[key] = resolvers[key]
    })

    parent = Object.getPrototypeOf(parent)
  }

  const model = createModel({
    name: target.name,
    schema,
    resolvers: {
      ...resolverMap,
      ...modelResolvers
    }
  })

  modelCache.set(schemaId, model)

  return model
}
