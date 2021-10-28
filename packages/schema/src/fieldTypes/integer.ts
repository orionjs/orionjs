import fieldType from '../fieldType'
import isInteger from 'lodash/isInteger'
import Errors from '../Errors'
import number from './number'

export default fieldType({
  name: 'integer',
  validate(value: number, info) {
    if (!isInteger(value)) return Errors.NOT_AN_INTEGER
    return number.validate(value, info)
  }
})
