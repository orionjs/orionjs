import fieldType from '../fieldType'
import isString from 'lodash/isString'
import isInteger from 'lodash/isInteger'
import Errors from '../Errors'

export default fieldType({
  name: 'ID',
  validate(value) {
    if (!isString(value) && !isInteger(value)) return Errors.NOT_AN_ID
  }
})
