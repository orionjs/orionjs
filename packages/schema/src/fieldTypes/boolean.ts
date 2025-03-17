import fieldType from '../fieldType'
import Errors from '../Errors'

export default fieldType<boolean>({
  name: 'boolean',
  validate(value) {
    if (typeof value !== 'boolean') return Errors.NOT_A_BOOLEAN
  },
  clean(value, {options}) {
    if (options.autoConvert) {
      if (typeof value === 'string') {
        const stringValue = value as string
        if (stringValue === 'true') {
          value = true
        }
        if (stringValue === 'false') {
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
  },
})
