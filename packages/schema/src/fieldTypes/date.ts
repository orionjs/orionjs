import fieldType from '../fieldType'
import Errors from '../Errors'

export default fieldType<Date>({
  name: 'date',
  validate(value) {
    if (!(value instanceof Date)) return Errors.NOT_A_DATE
  },
  clean(value: Date, {options}) {
    if (options.autoConvert) {
      if (typeof value === 'string') {
        const result = new Date(value)
        if (Number.isNaN(result.getTime())) {
          return value
        }

        value = result
      } else if (typeof value === 'number') {
        const result = new Date(value)
        if (Number.isNaN(result.getTime())) {
          return value
        }

        value = result
      }
    }

    return value
  },
})
