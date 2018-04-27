import fieldType from '../fieldType'
import isBoolean from 'lodash/isBoolean'
import Errors from '../Errors'

export default fieldType({
  name: 'boolean',
  validate(value) {
    if (!isBoolean(value)) return Errors.NOT_A_BOOLEAN
  }
})
