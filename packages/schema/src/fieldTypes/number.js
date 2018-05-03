import fieldType from '../fieldType'
import isFinite from 'lodash/isFinite'
import Errors from '../Errors'
import toNumber from 'lodash/toNumber'

export default fieldType({
  name: 'number',
  validate(value, {currentSchema}) {
    if (!isFinite(value)) return Errors.NOT_A_NUMBER

    if (isFinite(currentSchema.min)) {
      if (value < currentSchema.min) {
        return Errors.NUMBER_TOO_SMALL
      }
    }

    if (isFinite(currentSchema.max)) {
      if (value > currentSchema.max) {
        return Errors.NUMBER_TOO_BIG
      }
    }
  },
  clean(value, {options: {autoConvert}}) {
    if (typeof value === 'string' && autoConvert) {
      value = toNumber(value)
    }

    return value
  }
})
