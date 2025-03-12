import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {getFieldType} from '@orion-js/schema'
import omit from 'lodash/omit'
import getScalar from '../buildSchema/getType/getScalar'
import {getStaticFields} from './getStaticFields'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export default async function getParams(field: any) {
  const {type} = field

  if (type?.[Symbol.metadata]?._getModel) {
    const model = type[Symbol.metadata]._getModel()
    return await getParams({...field, type: model})
  }

  if (typeof type === 'function' && type.getModel && type.__schemaId) {
    const model = type.getModel()
    return await getParams({...field, type: model})
  }
  if (isArray(type)) {
    const serialized = await getParams({...field, type: type[0]})
    return {
      ...serialized,
      type: [serialized.type],
      __graphQLType: `[${serialized.__graphQLType}]`,
    }
  }
  if (!type.__isFieldType && (isPlainObject(type) || type.__isModel)) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type is not a Model')

    const fields = {}

    for (const field of getStaticFields(model)) {
      fields[field.key] = await getParams(field)
    }

    return {
      ...omit(field, 'key'),
      type: fields,
      __graphQLType: `${model.name}Input`,
    }
  }
  const schemaType = getFieldType(type)
  const graphQLType = await getScalar(schemaType)
  return {
    ...omit(field, 'key'),
    type: schemaType.name,
    __graphQLType: graphQLType.name,
  }
}
