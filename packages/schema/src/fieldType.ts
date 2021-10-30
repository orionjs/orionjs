import {CleanFunction, SchemaNodeType, ValidateFunction} from './types/schema'

export interface FieldTypeOpts {
  name: string
  validate?: ValidateFunction
  clean?: CleanFunction
}

export interface FieldType {
  name: string
  validate: ValidateFunction
  clean: CleanFunction
  _isFieldType: boolean
}

export default function fieldType(opts: FieldTypeOpts): FieldType {
  const {name, validate, clean, ...otherFields} = opts
  const overwrittenValidate: ValidateFunction = (value, info = {}) => {
    if (!info.currentSchema) {
      info.currentSchema = {}
    }
    return validate(value, info)
  }

  const overwrittenClean: CleanFunction = (value, info = {}) => {
    if (!info.options) {
      info.options = {}
    }
    if (clean) {
      return clean(value, info)
    }

    return value
  }

  return {
    ...otherFields,
    name,
    validate: overwrittenValidate,
    clean: overwrittenClean,
    _isFieldType: true
  }
}
