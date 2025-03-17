import fieldType from '../fieldType'
import Errors from '../Errors'

export default fieldType<number>({
  name: 'number',
  validate(value: number, {currentSchema}) {
    if (!Number.isFinite(value)) return Errors.NOT_A_NUMBER

    if (Number.isFinite(currentSchema.min)) {
      if (value < currentSchema.min) {
        return Errors.NUMBER_TOO_SMALL
      }
    }

    if (Number.isFinite(currentSchema.max)) {
      if (value > currentSchema.max) {
        return Errors.NUMBER_TOO_BIG
      }
    }
  },
  clean(value, {options: {autoConvert}}) {
    if (typeof value === 'string' && autoConvert) {
      value = Number(value)
    }

    return value
  },
})
