import fieldType from '../fieldType'
import isDate from 'lodash/isDate'
import Errors from '../Errors'
import isString from 'lodash/isString'
import isNumber from 'lodash/isNumber'

export default fieldType({
  name: 'date',
  validate(value) {
    if (!isDate(value)) return Errors.NOT_A_DATE
  },
  clean(value: Date, {options}) {
    if (options.autoConvert) {
      if (isString(value)) {
        const result = new Date(value)
        if (isNaN(result.getTime())) {
          return value
        }

        value = result
      } else if (isNumber(value)) {
        const result = new Date(value)
        if (isNaN(result.getTime())) {
          return value
        }

        value = result
      }
    }

    return value
  }
})
