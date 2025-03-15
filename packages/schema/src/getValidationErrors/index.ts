import {getSchemaFromAnyOrionForm} from '../models'
import {StrictInferSchemaType} from '../types'
import {Schema} from '../types/schema'
import doValidation from './doValidation'
import getValidationErrorsObject from './getValidationErrorsObject'

const defaultOptions = {
  omitRequired: false,
}

export default async function getValidationErrors<TSchema extends Schema>(
  schema: TSchema,
  doc: StrictInferSchemaType<TSchema>,
  passedOptions = {},
  ...args
) {
  schema = getSchemaFromAnyOrionForm(schema) as TSchema

  const options = {...defaultOptions, ...passedOptions}
  const errors: {key: string; code: string}[] = []

  const addError = (keys, code) => {
    errors.push({
      key: keys.join('.'),
      code,
    })
  }

  console.log('getValidationErrors', {schema, doc, options, args})

  await doValidation({
    schema,
    doc,
    currentDoc: doc,
    value: doc,
    currentSchema: {type: schema},
    addError,
    options,
    args,
  })

  return getValidationErrorsObject(errors)
}
