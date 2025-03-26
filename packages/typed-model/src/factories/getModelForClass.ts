/* eslint-disable @typescript-eslint/ban-types */
import {createModel, Model} from '@orion-js/models'
import {SchemaFromTypedSchemaMetadata} from '..'
import {getParamTypeForProp} from './processTypeForProp'
import {Schema} from '@orion-js/schema'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export function getModelForClass(target: any): Model {
  const targetAsModel = target as any as Model
  if (targetAsModel.__isModel) {
    return targetAsModel
  }

  const metadata = target[Symbol.metadata] as SchemaFromTypedSchemaMetadata

  if (!metadata) {
    return targetAsModel
  }

  return internal_getModelForClassFromMetadata(metadata)
}

export function internal_getModelForClassFromMetadata(metadata: SchemaFromTypedSchemaMetadata) {
  const modelName = metadata._modelName

  const schema: Schema = {}
  const keys = Object.keys(metadata ?? {})
  const injectionKeys = keys.filter(key => key.startsWith('_prop:'))

  for (const key of injectionKeys) {
    const prop = metadata[key] as Schema
    const schemaProp = key.replace('_prop:', '')

    schema[schemaProp] = {
      ...prop,
      type: getParamTypeForProp(prop.type as any),
    }
  }

  const model = createModel({
    ...metadata._modelOptions,
    name: modelName,
    schema,
  })

  return model
}
