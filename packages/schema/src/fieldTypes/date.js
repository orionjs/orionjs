import fieldType from '../fieldType'
import isDate from 'lodash/isDate'
import Errors from '../Errors'

export default fieldType({
  validate(value) {
    if (!isDate(value)) return Errors.NOT_A_DATE
  }
})
