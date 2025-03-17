import fieldType from '../fieldType'
import Errors from '../Errors'

export default fieldType<string>({
  name: 'ID',
  validate(value: string) {
    if (typeof value !== 'string' && !Number.isInteger(value)) return Errors.NOT_AN_ID
  },
  clean(value: string, {options}) {
    if (typeof value !== 'string' && !Number.isInteger(value)) return value
    const {trimStrings, removeEmptyStrings} = options

    value = String(value)

    if (trimStrings) {
      value = value.trim()
    }

    if (removeEmptyStrings && value === '') {
      return undefined
    }

    return value
  },
})
