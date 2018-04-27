import fieldType from '../fieldType'
import isPlainObject from 'lodash/isPlainObject'
import Errors from '../Errors'

export default fieldType({
  name: 'plainObject',
  validate(value) {
    if (!isPlainObject(value)) return Errors.NOT_AN_OBJECT
  }
})
