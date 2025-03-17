import getFieldValidator from './getValidationErrors/getError/getFieldValidator'
import {Schema, SchemaFieldType, SchemaFieldTypeNonSchema, SchemaWithMetadata} from './types'

// @ts-ignore polyfill for Symbol.metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export function isSchemaLike(type: any): boolean {
  if (!type) return false

  if (objectHasSubObjectWithKey(type, 'type')) return true
  if (type?.[Symbol.metadata]?._getModel) return true
  if (type.getModel) return true
  if (type.getSchema) return true
  if (type.getCleanSchema) return true
  if (type.__isModel) return true
  if (type.__modelName) return true

  return false
}

export function isStrictSchemaLike<TType extends Schema | SchemaFieldTypeNonSchema>(
  type: TType,
): TType extends Schema ? true : false {
  if (isSchemaLike(type)) return true as any
  return false as any
}

export function isSchemaOrFieldLike(type: any): boolean {
  if (Array.isArray(type)) {
    if (type.length !== 1) return false
    return isSchemaOrFieldLike(type[0])
  }

  if (isSchemaLike(type)) return true
  try {
    if (getFieldValidator(type)) return true
  } catch {
    return false
  }

  return false
}

export function getSchemaModelName(type: any): string | null {
  if (!type) return null
  if (type.__modelName) return type.__modelName
  if (type.getModel) return type.getModel().name
  if (type.getSchema) return type.getSchema().__modelName
  return null
}

export function getSchemaFromAnyOrionForm(type: any): SchemaFieldType {
  if (!type) return type

  if (type?.[Symbol.metadata]?._getModel) {
    return type?.[Symbol.metadata]?._getModel().getSchema()
  }
  if (type?.getModel) return type.getModel().getSchema()

  if (type.getSchema) {
    return type.getSchema()
  }

  if (objectHasSubObjectWithKey(type, 'type')) return type // ya es un schema

  return type
}

function objectHasSubObjectWithKey(object: any, key: string) {
  if (!object || typeof object !== 'object') return false

  for (const key1 in object) {
    const value = object[key1]
    if (value && typeof value === 'object' && key in value) {
      return true
    }
  }

  return false
}

export function getSchemaWithMetadataFromAnyOrionForm(type: any): SchemaWithMetadata {
  return getSchemaFromAnyOrionForm(type) as SchemaWithMetadata
}
