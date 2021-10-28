import fieldType from '../fieldType'
import isPlainObject from 'lodash/isPlainObject'
import Errors from '../Errors'
import difference from 'lodash/difference'

export default fieldType({
  name: 'plainObject',
  validate(value: object) {
    if (!isPlainObject(value)) return Errors.NOT_AN_OBJECT
  },
  clean(value, {type, options}) {
    if (!isPlainObject(value)) return value

    if (options.filter) {
      const documentKeys = Object.keys(value)
      const schemaKeys = Object.keys(type)
      const notInSchemaKeys = difference(documentKeys, schemaKeys)
      for (const key of notInSchemaKeys) {
        delete value[key]
      }
    }

    return value
  }
})
