import getError from './getError'
import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import clone from 'lodash/clone'
import isNil from 'lodash/isNil'
import difference from 'lodash/difference'
import Errors from '../Errors'
import {CurrentNodeInfo, SchemaNode, SchemaRecursiveNodeTypeExtras, SchemaMetaFieldType} from '../types/schema'
import {convertTypedModel} from './convertTypedModel'

export default async function doValidation(params: CurrentNodeInfo) {
  convertTypedModel(params)
  const {value, currentSchema} = params
  const shouldValueHaveChildren = isTypeDeep(currentSchema.type) && !isNil(value)
  if (shouldValueHaveChildren) await validateChildValues(params)
  
  await validateCurrentValue(params)
}

function isTypeDeep(type: SchemaMetaFieldType) { return isPlainObject(type) || isArray(type) }

async function validateChildValues(params: CurrentNodeInfo) {
  convertTypedModel(params)

  const {value, currentSchema, keys = [], addError} = params
  const info = getInfo(params)

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
    for (let i = 0; i < value.length; i++) {
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

function getInfo(params: CurrentNodeInfo) {
  const {schema, doc, currentDoc, value, currentSchema, keys = [], addError, options, args} = params
  return {schema, doc, currentDoc, value, currentSchema, keys, options, args, addError}
}

async function validateCurrentValue(params: CurrentNodeInfo) {
  const {keys = [], addError} = params
  const info = getInfo(params)
  const error = await getError(info)
  if (error) addError(keys, error)  
}
