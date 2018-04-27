import getFieldValidator from './getFieldValidator'
import fieldTypes from '../../fieldTypes'

export default async function(type) {
  const validatorKey = await getFieldValidator(type)
  const validator = validatorKey === 'custom' ? type : fieldTypes[validatorKey]
  return validator
}
