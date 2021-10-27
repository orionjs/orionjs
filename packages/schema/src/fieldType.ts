import {CleanFunction, SchemaNodeType, ValidateFunction} from './types/schema'

export interface FieldTypeOpts<T extends SchemaNodeType> {
  name: string
  validate?: ValidateFunction<T>
  clean?: CleanFunction<T>
}

export interface FieldType<T extends SchemaNodeType> {
  name: string
  validate: ValidateFunction<T>
  clean: CleanFunction<T>
  _isFieldType: boolean
}

export default function fieldType<T extends SchemaNodeType>(opts: FieldTypeOpts<T>): FieldType<T> {
  const {name, validate, clean, ...otherFields} = opts
  const overwrittenValidate: ValidateFunction<T> = (value, info = {}) => {
    if (!info.currentSchema) {
      info.currentSchema = {}
    }
    return validate(value, info)
  }

  const overwrittenClean: CleanFunction<T> = (value, info = {}) => {
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
