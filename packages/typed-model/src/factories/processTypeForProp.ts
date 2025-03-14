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

  if (type?.getSchema) {
    return getParamTypeForProp(type.getSchema())
  }

  if (isType('Object', type)) {
    if (type.__isFieldType) {
      return type
    }

    const subschema = {}
    Object.keys(type).forEach(key => {
      if (key.startsWith('__')) {
        subschema[key] = type[key]
        return
      }

      subschema[key] = {
        ...type[key],
        type: getParamTypeForProp(type[key].type),
      }
    })

    return subschema
  }

  return type
}
