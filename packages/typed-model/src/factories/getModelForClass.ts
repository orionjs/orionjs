/* eslint-disable @typescript-eslint/ban-types */
import { createModel, Model, ModelSchema, ModelResolversMap } from '@orion-js/models'
import { SchemaFromTypedModelMetadata } from '..'
import { getParamTypeForProp } from './processTypeForProp';

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol("Symbol.metadata");

const modelCache = new Map<string, Model>()

export function resetModelCache() {
  modelCache.clear()
}

export function getModelForClass(target: any): Model {
  const targetAsModel = target as any as Model
  if (targetAsModel.__isModel) {
    return targetAsModel
  }

  const metadata = target[Symbol.metadata] as SchemaFromTypedModelMetadata

  if (!metadata) {
    return targetAsModel
  }

  return internal_getModelForClassFromMetadata(metadata)
}

export function internal_getModelForClassFromMetadata(metadata: SchemaFromTypedModelMetadata) {
  const modelName = metadata._modelName
  if (modelCache.has(modelName)) {
    return modelCache.get(modelName)
  }

  const schema: ModelSchema = {}
  const keys = Object.keys(metadata ?? {})
  const injectionKeys = keys.filter(key => key.startsWith('_prop:'))


  for (const key of injectionKeys) {
    const prop = metadata[key] as ModelSchema
    const schemaProp = key.replace('_prop:', '')

    schema[schemaProp] = {
      ...prop,
      type: getParamTypeForProp(prop.type)
    }
  }

  const model = createModel({
    ...metadata._modelOptions,
    name: modelName,
    schema,
  })

  modelCache.set(modelName, model)

  return model
}