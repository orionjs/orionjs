import fieldType, {FieldType} from '../fieldType'
import Errors from '../Errors'

export default function createEnum<const TValues extends readonly string[]>(
  name: string,
  values: TValues,
): FieldType<TValues[number]> {
  return fieldType({
    name: 'enum',
    meta: {
      enumName: name,
      enumValues: values,
    },
    toGraphQLType: GraphQL => {
      global.GraphQLEnums = global.GraphQLEnums || {}

      global.GraphQLEnums[name] =
        global.GraphQLEnums[name] ||
        new GraphQL.GraphQLEnumType({
          name,
          values: values.reduce((result, value) => {
            result[value] = {value}
            return result
          }, {}),
        })

      return global.GraphQLEnums[name]
    },
    validate(value: string, {currentSchema}) {
      if (typeof value !== 'string') return Errors.NOT_A_STRING

      if (!values.includes(value)) {
        return Errors.NOT_AN_ALLOWED_VALUE
      }

      if (value === '' && !currentSchema.optional) {
        return Errors.REQUIRED
      }
    },
    clean(value, {options: {autoConvert, trimStrings, removeEmptyStrings}}) {
      if (autoConvert) {
        value = String(value)
      }

      if (trimStrings) {
        value = value.trim()
      }

      if (removeEmptyStrings && value === '') {
        return undefined
      }

      return value
    },
  })
}
