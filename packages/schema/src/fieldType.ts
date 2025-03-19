import {CleanFunction, SchemaFieldType, SchemaNode, ValidateFunction} from './types/schema'

export interface FieldTypeOpts<TType = any> {
  name: string
  validate?: ValidateFunction<TType>
  clean?: CleanFunction<TType>
  toGraphQLType?: (GraphQL: any) => any
  meta?: any
}

export interface FieldType<TType = any> {
  name: string
  validate: ValidateFunction
  clean: CleanFunction
  meta?: any
  toGraphQLType?: (GraphQL: any) => any
  toSerializedType?: (node: SchemaNode) => Promise<SchemaFieldType>
  __tsFieldType: TType
  __isFieldType: boolean
}

export default function fieldType<TType>(opts: FieldTypeOpts<TType>): FieldType<TType> {
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
    __isFieldType: true,
    __tsFieldType: null,
  }
}
