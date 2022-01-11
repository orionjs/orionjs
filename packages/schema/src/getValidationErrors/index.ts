import {getSchemaFromTypedModel} from '../getSchemaFromTypedModel'
import {Schema} from '../types/schema'
import doValidation from './doValidation'
import getValidationErrorsObject from './getValidationErrorsObject'

const defaultOptions = {
  omitRequired: false
}

export default async function getValidationErrors(
  schema: Schema | Function,
  doc: any,
  passedOptions = {},
  ...args
) {
  schema = getSchemaFromTypedModel(schema)

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
