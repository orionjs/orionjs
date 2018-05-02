import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {getFieldType} from '@orion-js/schema'
import Model from '../../Model'
import omit from 'lodash/omit'

export default async function getParams(type) {
  if (isArray(type)) {
    const serialized = await getParams(type[0])
    return [serialized]
  } else if (isPlainObject(type) || type instanceof Model) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type if not a Model', type)

    const fields = {}

    for (const field of model.staticFields) {
      fields[field.key] = {
        ...omit(field, 'key'),
        type: await getParams(field.type)
      }
    }

    return {
      name: model.name + 'Input',
      fields
    }
  } else {
    const schemaType = await getFieldType(type)
    return schemaType.name
  }
}
