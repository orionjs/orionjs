import fieldType from '../fieldType'
import isPlainObject from 'lodash/isPlainObject'
import Errors from '../Errors'

export default fieldType({
  name: 'blackbox',
  validate(value) {
    if (!isPlainObject(value)) return Errors.NOT_AN_OBJECT
  }
})
