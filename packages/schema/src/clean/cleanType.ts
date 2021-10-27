import getFieldType from '../getValidationErrors/getError/getFieldType'
import isNil from 'lodash/isNil'
import {
  CurrentNodeInfo,
  SchemaMetaFieldType,
  SchemaNode,
  SchemaNodeType,
  SchemaRecursiveNodeType
} from '../types/schema'
import {FieldValidatorType} from '../types/fieldValidators'
import getObjectNode from './getObjectNode'

export default async function cleanType<T extends SchemaNodeType>(
  type: SchemaMetaFieldType<T> | FieldValidatorType,
  fieldSchema: Partial<SchemaNode<T>>,
  value: T,
  info: CurrentNodeInfo<any>,
  ...args: any[]
): Promise<T> {
  info.type = fieldSchema.type
  if (!info.type) {
    throw new Error('Cleaning field with no type')
  }

  const {clean: rootFieldClean} = await getFieldType(type)

  if (rootFieldClean && !isNil(value)) {
    value = (await rootFieldClean(value, info, ...args)) as T
  }

  let needReClean = false

  const objectTypeSchema = getObjectNode(fieldSchema, value)
  if (objectTypeSchema && (objectTypeSchema.type as SchemaRecursiveNodeType).__clean) {
    needReClean = true
    value = await (objectTypeSchema.type as SchemaRecursiveNodeType).__clean(value, info, ...args)
  }

  const {defaultValue} = fieldSchema
  if (isNil(value) && !isNil(defaultValue)) {
    needReClean = true
    if (typeof defaultValue === 'function') {
      value = await defaultValue(info, ...args)
    } else {
      value = defaultValue
    }
  }

  const {autoValue} = fieldSchema
  if (autoValue) {
    needReClean = true
    value = await autoValue(value, info, ...args)
  }

  const {clean} = fieldSchema
  if (clean) {
    needReClean = true
    value = await clean(value, info, ...args)
  }

  if (needReClean && rootFieldClean && !isNil(value)) {
    value = (await rootFieldClean(value, info, ...args)) as T
  }

  return value
}
