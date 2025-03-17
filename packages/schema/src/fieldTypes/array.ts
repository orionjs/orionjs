import fieldType from '../fieldType'
import Errors from '../Errors'

export default fieldType<any[]>({
  name: 'array',
  validate(value) {
    if (!Array.isArray(value)) return Errors.NOT_AN_ARRAY
  },
  clean(value, {options}) {
    if (options.autoConvert) {
      if (!Array.isArray(value)) {
        value = [value]
      }
    }

    return value
  },
})
