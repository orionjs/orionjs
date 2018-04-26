import fieldType from '../fieldType'
import isArray from 'lodash/isArray'
import Errors from '../Errors'

export default fieldType({
  validate(value) {
    if (!isArray(value)) return Errors.NOT_AN_ARRAY
  }
})
