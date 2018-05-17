import fieldType from '../fieldType'
import isString from 'lodash/isString'
import Errors from '../Errors'
import includes from 'lodash/includes'
import isArray from 'lodash/isArray'

export default fieldType({
  name: 'string',
  validate(value, {currentSchema}) {
    if (!isString(value)) return Errors.NOT_A_STRING

    if (isFinite(currentSchema.min)) {
      if (value.length < currentSchema.min) {
        return Errors.STRING_TOO_SHORT
      }
    }

    if (isFinite(currentSchema.max)) {
      if (value.length > currentSchema.max) {
        return Errors.STRING_TOO_LONG
      }
    }

    if (isArray(currentSchema.allowedValues)) {
      if (!includes(currentSchema.allowedValues, value)) {
        return Errors.NOT_AN_ALLOWED_VALUE
      }
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
