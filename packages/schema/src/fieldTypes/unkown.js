import fieldType from '../fieldType'
import Errors from '../Errors'

export default fieldType({
  validate(value) {
    return Errors.UNKNOWN_FIELD_TYPE
  }
})
