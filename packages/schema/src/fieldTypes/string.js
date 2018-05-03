import fieldType from '../fieldType'
import isString from 'lodash/isString'
import Errors from '../Errors'

export default fieldType({
  name: 'string',
  validate(value, {currentSchema}) {
    if (!isString(value)) return Errors.NOT_A_STRING

    if (isFinite(currentSchema.min)) {
      if (value.length < currentSchema.min) {
        return Errors.TOO_SHORT
      }
    }

    if (isFinite(currentSchema.max)) {
      if (value.length > currentSchema.max) {
        return Errors.TOO_LONG
      }
    }
  }
})
