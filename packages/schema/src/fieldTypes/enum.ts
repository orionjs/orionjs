import fieldType, {FieldType} from '../fieldType'
import isString from 'lodash/isString'
import Errors from '../Errors'
import includes from 'lodash/includes'

export default function createEnum<TValues extends readonly string[]>(
  name: string,
  values: TValues
): FieldType & {type: TValues[number]} {
  return {
    type: values[0],
    ...fieldType({
      name: 'enum',
      meta: {
        enumName: name,
        enumValues: values
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
            }, {})
          })

        return global.GraphQLEnums[name]
      },
      validate(value: string, {currentSchema}) {
        if (!isString(value)) return Errors.NOT_A_STRING

        if (!includes(values, value)) {
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
      }
    })
  }
}
