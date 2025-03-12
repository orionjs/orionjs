import {Blackbox, SchemaRecursiveNodeTypeExtras} from './schema'

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

type SchemaKeysNotOfSchemaItems = keyof SchemaRecursiveNodeTypeExtras

type InferSchemaTypeForSchema<TSchema extends Record<string, any>> = Omit<
  {
    -readonly [K in keyof TSchema as TSchema[K]['optional'] extends true
      ? never
      : K]: InferSchemaTypeForFieldType<TSchema[K]['type']>
  } & {
    -readonly [K in keyof TSchema as TSchema[K]['optional'] extends true
      ? K
      : never]?: InferSchemaTypeForFieldType<TSchema[K]['type']>
  },
  SchemaKeysNotOfSchemaItems
>

// is a record with a child item that has type in its type
type IsPossiblyASchema<TType> = TType extends Record<string, any>
  ? keyof {
      [K in keyof TType as 'type' extends keyof TType[K] ? K : never]: TType[K]
    } extends never
    ? false
    : true
  : false

type AClass = abstract new (...args: any) => any

export type InferSchemaType<TType> = TType extends {__isModel: true; type: infer U}
  ? InferSchemaTypeForSchema<U>
  : TType extends AClass
    ? InstanceType<TType> // this line is wrong
    : IsPossiblyASchema<TType> extends true
      ? InferSchemaTypeForSchema<TType>
      : InferSchemaTypeForFieldType<TType>
