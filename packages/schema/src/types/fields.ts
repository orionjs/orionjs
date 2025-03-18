import {createEnum} from '..'
import {FieldType} from '../fieldType'
import {Blackbox, Schema, SchemaMetaFieldTypeSingleNonSchema, TypedSchemaOnSchema} from './schema'

type InferSchemaTypeForFieldType<T> =
  // field type with setted _tsFieldType
  T extends {__tsFieldType: infer U}
    ? U
    : // typed as strings
      T extends 'string'
      ? string
      : T extends 'date'
        ? Date
        : T extends 'integer'
          ? number
          : T extends 'number'
            ? number
            : T extends 'ID'
              ? string
              : T extends 'boolean'
                ? boolean
                : T extends 'email'
                  ? string
                  : T extends 'blackbox'
                    ? Blackbox
                    : T extends 'any'
                      ? any
                      : // typed as object constructors (Like String, Number, Boolean, Date)
                        T extends String
                        ? string
                        : T extends Number
                          ? number
                          : T extends Boolean
                            ? boolean
                            : T extends Date
                              ? Date
                              : T extends StringConstructor
                                ? string
                                : T extends NumberConstructor
                                  ? number
                                  : T extends BooleanConstructor
                                    ? boolean
                                    : T extends DateConstructor
                                      ? Date
                                      : // if is array, return infer the first element recursively
                                        T extends Array<infer U>
                                        ? InferSchemaTypeForFieldType<U>[]
                                        : // if is object, asume it's a schema and infer the type of the object
                                          T extends Record<string, any>
                                          ? InferSchemaTypeForSchema<T>
                                          : T

type SchemaKeysNotOfSchemaItems = '__isFieldType' | '__GraphQLType' | '__skipChildValidation'

type NodeIsOptional<TNode> = TNode extends {optional: true} ? true : false

// esto hace que haya un infinity loopp
// type NodeIsOptional<TNode> = TNode extends {optional: true}
//   ? true
//   : TNode extends {defaultValue: any}
//     ? true
//     : false

export type Simplifed<T> = {
  [K in keyof T]: T[K] extends object ? Simplifed<T[K]> : T[K]
}

type WithoutNotSchemaItems<T extends Record<string, any>> = T extends {
  [key in SchemaKeysNotOfSchemaItems]: any
} & Record<string, any>
  ? Omit<T, SchemaKeysNotOfSchemaItems>
  : T

type InferSchemaTypeForSchema<TSchema extends Record<string, any>> = Simplifed<
  WithoutNotSchemaItems<
    {
      -readonly [K in keyof TSchema as NodeIsOptional<TSchema[K]> extends true
        ? never
        : K]: InferSchemaType<TSchema[K]['type']>
    } & {
      -readonly [K in keyof TSchema as NodeIsOptional<TSchema[K]> extends true
        ? K
        : never]?: InferSchemaType<TSchema[K]['type']>
    }
  >
>

// is a record with a child item that has type in its type
type IsPossiblyASchema<TType> = TType extends FieldType
  ? false
  : TType extends Record<string, any>
    ? keyof {
        [K in keyof TType as 'type' extends keyof TType[K] ? K : never]: TType[K]
      } extends never
      ? false
      : true
    : false

type AClass<T = any> = abstract new (...args: any) => T

/**
 * Returns the type of the schema
 */
export type InferSchemaType<TType> = TType extends {__isModel: true; type: infer U}
  ? InferSchemaTypeForSchema<U>
  : TType extends SchemaMetaFieldTypeSingleNonSchema
    ? InferSchemaTypeForFieldType<TType>
    : TType extends AClass<infer U>
      ? U
      : IsPossiblyASchema<TType> extends true
        ? InferSchemaTypeForSchema<TType>
        : InferSchemaTypeForFieldType<TType>

/**
 * Returns the type of the schema but only if its a schema
 */
export type StrictInferSchemaType<TSchema extends Schema> = InferSchemaTypeForSchema<TSchema>
/**
 * Returns the type of the schema but only if its a schema
 */
export type InferSchemaTypeFromTypedSchema<TTypedSchema extends TypedSchemaOnSchema> = TTypedSchema

const subSchema = {
  name: {
    type: String,
  },
}

const schema = {
  filter: {
    type: String,
  },
  sub: {
    type: subSchema,
  },
  gender: {
    type: createEnum('gender', ['male', 'female']),
  },
  page: {
    type: 'integer',
    defaultValue: 1,
    min: 1,
  },
  limit: {
    type: 'integer',
    defaultValue: 0,
    min: 0,
    max: 200,
  },
  sortBy: {
    type: String,
    optional: true,
  },
  sortType: {
    type: String,
    allowedValues: ['asc', 'desc'],
    optional: true,
  },
} as const

type _ = InferSchemaType<typeof schema>

const _a: _ = {
  filter: '123',
  gender: 'male',
  sub: {
    name: '123',
  },
  limit: 1,
  page: 1,
}

type _2 = NodeIsOptional<(typeof schema)['sortType']>
