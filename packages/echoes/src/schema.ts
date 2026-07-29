export type EchoesSchema = unknown

type InferFieldType<T> = T extends {__tsFieldType: infer U}
  ? U
  : T extends 'string' | 'ID' | 'email'
    ? string
    : T extends 'date'
      ? Date
      : T extends 'integer' | 'number'
        ? number
        : T extends 'boolean'
          ? boolean
          : T extends 'blackbox'
            ? Record<string, any>
            : T extends 'any'
              ? any
              : T extends String | StringConstructor
                ? string
                : T extends Number | NumberConstructor
                  ? number
                  : T extends Boolean | BooleanConstructor
                    ? boolean
                    : T extends Date | DateConstructor
                      ? Date
                      : T extends Array<infer U>
                        ? InferFieldType<U>[]
                        : T extends Record<string, any>
                          ? InferObjectSchema<T>
                          : T

type NodeIsOptional<T> = T extends {optional: true} ? true : false

type InferObjectSchema<T extends Record<string, any>> = {
  -readonly [K in keyof T as NodeIsOptional<T[K]> extends true ? never : K]: InferEchoesSchema<
    T[K] extends {type: infer U} ? U : T[K]
  >
} & {
  -readonly [K in keyof T as NodeIsOptional<T[K]> extends true ? K : never]?: InferEchoesSchema<
    T[K] extends {type: infer U} ? U : T[K]
  >
}

type IsObjectSchema<T> =
  T extends Record<string, any>
    ? keyof {
        [K in keyof T as T[K] extends {type: any} ? K : never]: T[K]
      } extends never
      ? false
      : true
    : false

type AbstractClass<T = any> = abstract new (...args: any[]) => T

/**
 * Infers the value represented by Orion-style schema declarations without
 * requiring @orion-js/schema to be installed.
 */
export type InferEchoesSchema<T> = T extends {__echoesType: infer U}
  ? U
  : T extends {__tsFieldType: infer U}
    ? U
    : T extends {__isModel: true; type: infer U}
      ? U extends Record<string, any>
        ? InferObjectSchema<U>
        : InferFieldType<U>
      : T extends StringConstructor
        ? string
        : T extends NumberConstructor
          ? number
          : T extends BooleanConstructor
            ? boolean
            : T extends DateConstructor
              ? Date
              : T extends AbstractClass<infer U>
                ? U
                : IsObjectSchema<T> extends true
                  ? T extends Record<string, any>
                    ? InferObjectSchema<T>
                    : never
                  : InferFieldType<T>

/**
 * Adds compile-time value information to a runtime schema such as SimpleSchema.
 * It returns the same object and has no runtime cost.
 */
export function typedEchoesSchema<TValue, TSchema extends object = object>(
  schema: TSchema,
): TSchema & {readonly __echoesType: TValue} {
  return schema as TSchema & {readonly __echoesType: TValue}
}
