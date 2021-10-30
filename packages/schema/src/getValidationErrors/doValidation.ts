import getError from './getError'
import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import clone from 'lodash/clone'
import isNil from 'lodash/isNil'
import difference from 'lodash/difference'
import Errors from '../Errors'
import {
  CurrentNodeInfo,
  SchemaNode,
  SchemaNodeArrayType,
  SchemaRecursiveNodeTypeExtras
} from '../types/schema'

export default async function doValidation(params: CurrentNodeInfo) {
  const {schema, doc, currentDoc, value, currentSchema, keys = [], addError, options, args} = params
  const info = {schema, doc, currentDoc, value, currentSchema, keys, options, args, addError}

  const error = await getError(info)
  if (error) {
    addError(keys, error)
    return
  }

  if (isNil(value)) return

  /**
   * Deep validation
   */
  if (isPlainObject(currentSchema.type)) {
    const type = currentSchema.type as SchemaRecursiveNodeTypeExtras

    if (typeof type?.__skipChildValidation === 'function') {
      if (await type?.__skipChildValidation(value, info)) {
        return
      }
    }

    const schemaKeys = Object.keys(currentSchema.type).filter(key => !key.startsWith('__'))
    for (const key of schemaKeys) {
      const itemSchema = currentSchema.type[key] as SchemaNode
      const itemValue = value[key]
      const keyItemKeys = clone(keys)
      keyItemKeys.push(key)
      await doValidation({
        ...info,
        currentDoc: value,
        value: itemValue,
        currentSchema: itemSchema,
        keys: keyItemKeys
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
    for (let i = 0; i < (value as SchemaNodeArrayType).length; i++) {
      const itemValue = value[i]
      const keyItemKeys = clone(keys)
      keyItemKeys.push(i.toString())
      await doValidation({
        ...info,
        currentDoc: value,
        value: itemValue,
        currentSchema: {type: itemSchema},
        keys: keyItemKeys
      })
    }
  }
}
