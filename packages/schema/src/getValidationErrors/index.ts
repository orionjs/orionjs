import {Schema, SchemaNodeType} from '../types/schema'
import doValidation from './doValidation'
import getValidationErrorsObject from './getValidationErrorsObject'

const defaultOptions = {
  omitRequired: false
}

export default async function getValidationErrors<T extends SchemaNodeType>(
  schema: Schema,
  doc: T,
  passedOptions = {},
  ...args
) {
  const options = {...defaultOptions, ...passedOptions}
  const errors: {key: string; code: string}[] = []

  const addError = function (keys, code) {
    errors.push({
      key: keys.join('.'),
      code
    })
  }

  await doValidation({
    schema,
    doc,
    currentDoc: doc,
    value: doc,
    currentSchema: {type: schema},
    addError,
    options,
    args
  })

  return getValidationErrorsObject(errors)
}
