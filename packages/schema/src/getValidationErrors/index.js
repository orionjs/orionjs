import doValidation from './doValidation'
import getValidationErrorsObject from './getValidationErrorsObject'

export default async function(schema, doc) {
  const errors = []

  const addError = function(keys, code) {
    errors.push({
      key: keys.join('.'),
      code
    })
  }

  await doValidation({
    schema,
    doc,
    value: doc,
    currentSchema: {type: schema},
    addError
  })

  return getValidationErrorsObject(errors)
}
