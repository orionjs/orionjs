import getError from './getError'
import Errors from '../Errors'
import {CurrentNodeInfo, SchemaNode, SchemaRecursiveNodeTypeExtras} from '../types/schema'
import {convertTypedSchema} from './convertTypedSchema'
import {isNil, type} from 'rambdax'
import {clone} from '../clone'

export default async function doValidation(params: CurrentNodeInfo) {
  convertTypedSchema(params)

  const {schema, doc, currentDoc, value, currentSchema, keys = [], addError, options, args} = params
  const info = {
    schema,
    doc,
    currentDoc,
    value,
    currentSchema,
    keys,
    options,
    args,
    addError,
  }

  const error = await getError(info)
  if (error) {
    addError(keys, error)
    return
  }

  if (isNil(value)) return

  /**
   * Deep validation
   */
  if (type(currentSchema.type) === 'Object') {
    const type = currentSchema.type as SchemaRecursiveNodeTypeExtras

    if (type) {
      if (type.__isFieldType) {
        return
      }

      if (typeof type.__skipChildValidation === 'function') {
        if (await type.__skipChildValidation(value, info)) {
          return
        }
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
        keys: keyItemKeys,
      } as any)
    }

    const documentKeys = Object.keys(value)
    const notInSchemaKeys = documentKeys.filter(key => !schemaKeys.includes(key))
    for (const key of notInSchemaKeys) {
      const keyItemKeys = clone(keys)
      keyItemKeys.push(key)
      addError(keyItemKeys, Errors.NOT_IN_SCHEMA)
    }
  } else if (Array.isArray(currentSchema.type)) {
    const itemSchema = currentSchema.type[0]
    for (let i = 0; i < value.length; i++) {
      const itemValue = value[i]
      const keyItemKeys = clone(keys)
      keyItemKeys.push(i.toString())
      await doValidation({
        ...info,
        currentDoc: value,
        value: itemValue,
        currentSchema: {type: itemSchema},
        keys: keyItemKeys,
      })
    }
  }
}
