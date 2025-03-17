import getFieldType from '../getValidationErrors/getError/getFieldType'
import {isNil} from 'rambdax'
import {CurrentNodeInfo, SchemaFieldType, SchemaNode, SchemaMetadata, Schema} from '../types/schema'
import {FieldValidatorType} from '../types/fieldValidators'
import getObjectNode from './getObjectNode'

export default async function cleanType<TSchema extends Schema>(
  type: SchemaFieldType | FieldValidatorType,
  fieldSchema: Partial<SchemaNode>,
  value: any,
  info: CurrentNodeInfo<TSchema>,
  ...args: any[]
): Promise<any> {
  info.type = fieldSchema.type
  if (!info.type) {
    throw new Error('Cleaning field with no type')
  }

  const {clean: rootFieldClean} = await getFieldType(type)

  if (rootFieldClean && !isNil(value)) {
    value = await rootFieldClean(value, info, ...args)
  }

  let needReClean = false

  const objectTypeSchema = getObjectNode(fieldSchema, value)
  if (objectTypeSchema && (objectTypeSchema.type as SchemaMetadata).__clean) {
    needReClean = true
    value = await (objectTypeSchema.type as SchemaMetadata).__clean(value, info, ...args)
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

  const {clean} = fieldSchema
  if (clean) {
    needReClean = true
    value = await clean(value, info, ...args)
  }

  if (needReClean && rootFieldClean && !isNil(value)) {
    value = await rootFieldClean(value, info, ...args)
  }

  return value
}
