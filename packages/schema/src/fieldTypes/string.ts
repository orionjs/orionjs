import fieldType from '../fieldType'
import Errors from '../Errors'

export default fieldType<string>({
  name: 'string',
  validate(value: string, {currentSchema}) {
    if (typeof value !== 'string') return Errors.NOT_A_STRING

    if (Number.isFinite(currentSchema.min)) {
      if (value.length < currentSchema.min) {
        return Errors.STRING_TOO_SHORT
      }
    }

    if (Number.isFinite(currentSchema.max)) {
      if (value.length > currentSchema.max) {
        return Errors.STRING_TOO_LONG
      }
    }

    if (Array.isArray(currentSchema.allowedValues)) {
      if (!currentSchema.allowedValues.includes(value)) {
        return Errors.NOT_AN_ALLOWED_VALUE
      }
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
