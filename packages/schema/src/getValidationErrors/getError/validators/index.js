import array from './array'
import plainObject from './plainObject'
import string from './string'
import Errors from '../../../Errors'

export default {
  array,
  plainObject,
  string,
  unkown: () => Errors.UNKNOWN_FIELD_TYPE
}
