import {Schema, SchemaFieldType} from '.'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export const getSchemaFromTypedSchema = (schema: Schema | Function | SchemaFieldType): Schema => {
  const item = schema as any

  if (!schema[Symbol.metadata]) return item
  if (!schema[Symbol.metadata]._isTypedSchema) return item

  return schema[Symbol.metadata]._getModel().getSchema()
}
