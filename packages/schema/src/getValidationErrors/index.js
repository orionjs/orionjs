import doValidation from './doValidation'
import getValidationErrorsObject from './getValidationErrorsObject'

const defaultOptions = {
  omitRequired: false
}

export default async function(schema, doc, passedOptions = {}, ...args) {
  const options = {...defaultOptions, ...passedOptions}
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
    options,
    args
  })

  return getValidationErrorsObject(errors)
}
