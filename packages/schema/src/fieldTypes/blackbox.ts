import fieldType from '../fieldType'
import isPlainObject from 'lodash/isPlainObject'
import Errors from '../Errors'
import {Blackbox} from '../types'

export default fieldType<Blackbox>({
  name: 'blackbox',
  validate(value) {
    if (!isPlainObject(value)) return Errors.NOT_AN_OBJECT
  },
})
