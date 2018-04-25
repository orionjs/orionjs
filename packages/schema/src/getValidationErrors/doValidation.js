import getError from './getError'
import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import clone from 'lodash/clone'

export default async function doValidation({
  schema,
  doc,
  value,
  currentSchema,
  keys = [],
  addError
}) {
  const error = await getError({schema, doc, value, currentSchema, keys})
  if (error) {
    addError(keys, error)
    return
  }

  /**
   * Deep validation
   */
  if (isPlainObject(currentSchema.type)) {
    console.log('is plain object', keys.join('.'))
    const schemaKeys = Object.keys(currentSchema.type)
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
        addError
      })
    }
  } else if (isArray(currentSchema.type)) {
    console.log('is array', keys.join('.'))
    const itemSchema = currentSchema.type[0]
    for (let i = 0; i < value.length; i++) {
      const itemValue = value[i]
      const keyItemKeys = clone(keys)
      keyItemKeys.push(i)
      console.log('on array, keyItemKeys', keyItemKeys)
      await doValidation({
        schema,
        doc,
        value: itemValue,
        currentSchema: itemSchema,
        keys: keyItemKeys,
        addError
      })
    }
  }
}
