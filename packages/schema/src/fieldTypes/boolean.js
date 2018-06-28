import fieldType from '../fieldType'
import isBoolean from 'lodash/isBoolean'
import Errors from '../Errors'

export default fieldType({
  name: 'boolean',
  validate(value) {
    if (!isBoolean(value)) return Errors.NOT_A_BOOLEAN
  },
  clean(value, {options}) {
    if (options.autoConvert) {
      if (typeof value === 'string') {
        if (value === 'true') {
          value = true
        }
        if (value === 'false') {
          value = false
        }
      }
      if (typeof value === 'number') {
        if (value === 0) {
          value = false
        } else {
          value = true
        }
      }
    }

    return value
  }
})
