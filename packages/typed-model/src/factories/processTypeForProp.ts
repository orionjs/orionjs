import {isType} from 'rambdax'
import {PropOptions} from '../decorators/prop'

export function getParamTypeForProp(type: PropOptions['type']) {
  if (Array.isArray(type)) {
    const itemType = type[0]
    return [getParamTypeForProp(itemType)]
  }

  if (type?.[Symbol.metadata]?._getModel) {
    return type[Symbol.metadata]._getModel(type)
  }

  const objectType = type as Record<PropertyKey, any>

  if (objectType?.getSchema) {
    return getParamTypeForProp(objectType.getSchema())
  }

  if (isType('Object', type)) {
    if (objectType.__isFieldType) {
      return type
    }

    const subschema = {}
    for (const key of Object.keys(objectType)) {
      if (key.startsWith('__')) {
        subschema[key] = objectType[key]
        continue
      }

      subschema[key] = {
        ...objectType[key],
        type: getParamTypeForProp(objectType[key].type),
      }
    }

    return subschema
  }

  return type
}
