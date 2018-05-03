import getError from './getError'
import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import clone from 'lodash/clone'
import isNil from 'lodash/isNil'
import difference from 'lodash/difference'
import Errors from '../Errors'

export default async function doValidation({
  schema,
  doc,
  value,
  currentSchema,
  keys = [],
  addError,
  args
}) {
  const error = await getError({schema, doc, value, currentSchema, keys, args})
  if (error) {
    addError(keys, error)
    return
  }

  if (isNil(value)) return

  /**
   * Deep validation
   */
  if (isPlainObject(currentSchema.type)) {
    const schemaKeys = Object.keys(currentSchema.type).filter(key => !key.startsWith('__'))
    for (const key of schemaKeys) {
      const itemSchema = currentSchema.type[key]
      const itemValue = value[key]
      const keyItemKeys = clone(keys)
      keyItemKeys.push(key)
      await doValidation({
        schema,
        doc,
        value: itemValue,
        currentSchema: itemSchema,
        keys: keyItemKeys,
        addError,
        args
      })
    }

    const documentKeys = Object.keys(value)
    const notInSchemaKeys = difference(documentKeys, schemaKeys)
    for (const key of notInSchemaKeys) {
      const keyItemKeys = clone(keys)
      keyItemKeys.push(key)
      addError(keyItemKeys, Errors.NOT_IN_SCHEMA)
    }
  } else if (isArray(currentSchema.type)) {
    const itemSchema = currentSchema.type[0]
    for (let i = 0; i < value.length; i++) {
      const itemValue = value[i]
      const keyItemKeys = clone(keys)
      keyItemKeys.push(i)
      await doValidation({
        schema,
        doc,
        value: itemValue,
        currentSchema: {type: itemSchema},
        keys: keyItemKeys,
        addError,
        args
      })
    }
  }
}
