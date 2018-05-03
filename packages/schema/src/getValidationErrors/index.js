import doValidation from './doValidation'
import getValidationErrorsObject from './getValidationErrorsObject'

export default async function(schema, doc, ...args) {
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
    addError,
    args
  })

  return getValidationErrorsObject(errors)
}
