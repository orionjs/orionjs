import fieldType from '../fieldType'
import {type} from 'rambdax'
import Errors from '../Errors'
import {Blackbox} from '../types'

export default fieldType<Blackbox>({
  name: 'plainObject',
  validate(value: object) {
    if (type(value) !== 'Object') return Errors.NOT_AN_OBJECT
  },
  clean(value, {type: typeObj, options}) {
    if (type(value) !== 'Object') return value

    if (options.filter) {
      const documentKeys = Object.keys(value)
      const schemaKeys = Object.keys(typeObj)
      const notInSchemaKeys = documentKeys.filter(key => !schemaKeys.includes(key))
      for (const key of notInSchemaKeys) {
        delete value[key]
      }
    }

    return value
  },
})
