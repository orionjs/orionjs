import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {getFieldType} from '@orion-js/schema'
import omit from 'lodash/omit'
import getScalar from '../buildSchema/getType/getScalar'
import {getStaticFields} from './getStaticFields'

export default async function getParams(field) {
  const {type} = field
  if (isArray(type)) {
    const serialized = await getParams({...field, type: type[0]})
    return {
      ...serialized,
      type: [serialized.type],
      __graphQLType: `[${serialized.__graphQLType}]`
    }
  } else if (!type._isFieldType && (isPlainObject(type) || type.__isModel)) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type is not a Model')

    const fields = {}

    for (const field of getStaticFields(model)) {
      fields[field.key] = await getParams(field)
    }

    return {
      ...omit(field, 'key'),
      type: fields,
      __graphQLType: model.name + 'Input'
    }
  } else {
    const schemaType = await getFieldType(type)
    const graphQLType = await getScalar(schemaType)
    return {
      ...omit(field, 'key'),
      type: schemaType.name,
      __graphQLType: graphQLType.name
    }
  }
}
