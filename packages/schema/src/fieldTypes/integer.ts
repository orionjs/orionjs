import fieldType from '../fieldType'
import Errors from '../Errors'
import number from './number'

export default fieldType<number>({
  name: 'integer',
  validate(value: number, info) {
    if (!Number.isInteger(value)) return Errors.NOT_AN_INTEGER
    return number.validate(value, info)
  },
})
