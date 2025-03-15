import {getSchemaFromAnyOrionForm} from '../models'
import {InferSchemaType} from '../types'
import {SchemaFieldType} from '../types/schema'
import doValidation from './doValidation'
import getValidationErrorsObject from './getValidationErrorsObject'

const defaultOptions = {
  omitRequired: false,
}

export default async function getValidationErrors<TSchema extends SchemaFieldType>(
  schema: TSchema,
  doc: InferSchemaType<TSchema>,
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
