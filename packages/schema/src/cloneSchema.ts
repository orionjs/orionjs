import {isEmpty, pick} from 'rambdax'
import {Schema, SchemaNode} from './types'

export type CloneSchemaOptions<
  TSchema extends Schema,
  TExtendFields extends Schema,
  TPickFields extends keyof TSchema | undefined,
  TOmitFields extends keyof TSchema | undefined,
> = {
  /**
   * The schema to clone
   */
  schema: TSchema
  /**
   * The schema to extend the cloned schema with
   */
  extendSchema?: TExtendFields
  /**
   * A function to map the fields of the cloned schema.
   * Warning: This function will not be applied to the typescript types of this schema.
   */
  mapFields?: (field: TSchema[keyof TSchema], key: keyof TSchema) => SchemaNode
  /**
   * The fields to pick from the cloned schema
   */
  pickFields?: TPickFields[]
  /**
   * The fields to omit from the cloned schema
   */
  omitFields?: TOmitFields[]
}

// TExtendFields should replace TSchema if present
type ExtendFields<
  TSchema extends Schema,
  TExtendFields extends Schema | undefined,
> = TExtendFields extends undefined
  ? TSchema
  : {
      [key in keyof (TSchema & TExtendFields)]: key extends keyof TExtendFields
        ? TExtendFields[key]
        : key extends keyof TSchema
          ? TSchema[key]
          : never
    }

export type ClonedSchema<
  TSchema extends Schema,
  TExtendFields extends Schema,
  TPickFields extends keyof TSchema,
  TOmitFields extends keyof TSchema,
> = TPickFields extends undefined
  ? TOmitFields extends undefined
    ? ExtendFields<TSchema, TExtendFields>
    : ExtendFields<Omit<TSchema, TOmitFields>, TExtendFields>
  : ExtendFields<Pick<TSchema, TPickFields>, TExtendFields>

export function cloneSchema<
  TSchema extends Schema,
  TExtendFields extends Schema | undefined = undefined,
  TPickFields extends keyof TSchema | undefined = undefined,
  TOmitFields extends keyof TSchema | undefined = undefined,
>(
  options: CloneSchemaOptions<TSchema, TExtendFields, TPickFields, TOmitFields>,
): ClonedSchema<TSchema, TExtendFields, TPickFields, TOmitFields> {
  const {schema, extendSchema, mapFields, pickFields, omitFields} = options

  const originalMetaKeys = ['__schema', '__node', '__type']
  const originalMetaFields = pick(originalMetaKeys, schema)

  const cloned = {...schema} as any

  if (pickFields?.length) {
    for (const key in cloned) {
      if (!pickFields.includes(key as TPickFields)) {
        delete cloned[key]
      }
    }
  }

  if (omitFields?.length) {
    for (const key in cloned) {
      if (omitFields.includes(key as TOmitFields)) {
        delete cloned[key]
      }
    }
  }

  if (!isEmpty(extendSchema)) {
    for (const key in extendSchema) {
      cloned[key] = extendSchema[key]
    }
  }

  if (mapFields) {
    for (const key in cloned) {
      cloned[key] = mapFields(cloned[key], key)
    }
  }

  for (const key of originalMetaKeys) {
    if (originalMetaFields[key]) {
      cloned[key] = originalMetaFields[key]
    }
  }

  return cloned
}
