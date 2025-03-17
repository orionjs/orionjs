import fieldType from '../fieldType'
import {type} from 'rambdax'
import Errors from '../Errors'
import {Blackbox} from '../types'

export default fieldType<Blackbox>({
  name: 'blackbox',
  validate(value) {
    if (type(value) !== 'Object') return Errors.NOT_AN_OBJECT
  },
})
