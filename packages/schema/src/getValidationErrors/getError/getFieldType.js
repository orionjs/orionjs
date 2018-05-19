import getFieldValidator from './getFieldValidator'
import fieldTypes from '../../fieldTypes'

export default function(type) {
  const validatorKey = getFieldValidator(type)
  const validator = validatorKey === 'custom' ? type : fieldTypes[validatorKey]
  return validator
}
