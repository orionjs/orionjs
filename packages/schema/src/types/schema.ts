/* eslint-disable @typescript-eslint/ban-types */

export type Constructor<T> = new (...args: any[]) => T

export type SpecialSchemaString = 'ID' | 'email' | 'string'
export type SpecialSchemaNumber = 'number' | 'integer'
export type SpecialSchemaObject = 'blackbox'

export type SchemaRecursiveNodeTypeExtras = {
  __clean?: CleanFunction<any> // TODO: Remove any
  __validate?: ValidateFunction<any> // TODO: Remove any
}

export type SchemaRecursiveType = {
  [key: string]: SchemaNode<SchemaNodeType> | Function
}

export type SchemaRecursiveNodeType = SchemaRecursiveType & SchemaRecursiveNodeTypeExtras

export type SchemaNodeType = string | Date | number | boolean | object | SchemaNodeArrayType

export type SchemaNodeArrayType =
  | Array<string>
  | Array<Date>
  | Array<number>
  | Array<boolean>
  | Array<object>

/**
 * Converts the SchemaNodeType to its abstraction.
 * E.g. if the Node has type string, it will return the String constructor.
 */
export type StringAllowedTypeValues = SpecialSchemaString | Constructor<String>
export type NumberAllowedTypeValues = SpecialSchemaNumber | Constructor<Number>
export type ObjectAllowedTypeValues = SpecialSchemaObject | SchemaRecursiveNodeType

export type SchemaMetaFieldType<T> = T extends string
  ? StringAllowedTypeValues
  : T extends number
  ? NumberAllowedTypeValues
  : T extends boolean
  ? Constructor<Boolean>
  : T extends Date
  ? Constructor<Date>
  : T extends Array<infer U>
  ? Array<SchemaMetaFieldType<U>>
  : T extends object
  ? ObjectAllowedTypeValues
  : T

export type ValidateFunction<T extends SchemaNodeType> = (
  value: T,
  info?: Partial<CurrentNodeInfo<T>>,
  ...args: any[]
) => object | string | void | Promise<object | string | void>
export type CleanFunction<T extends SchemaNodeType> = (
  value: T,
  info?: Partial<CurrentNodeInfo<T>>,
  ...args: any[]
) => T | Promise<T>

export interface SchemaNode<T extends SchemaNodeType = SchemaNodeType> {
  /**
   * The type of the field. Used for type validations. Can also contain a subschema.
   */
  type: SchemaMetaFieldType<T>

  /**
   * Defaults to false
   */
  optional?: boolean

  allowedValues?: Array<T>

  defaultValue?: T | ((info: CurrentNodeInfo<T>, ...args: any[]) => T | Promise<T>)

  /**
   * Function that takes a value and returns an error message if there are any errors. Must return null or undefined otherwise.
   */
  validate?: ValidateFunction<T>

  /**
   * Function that preprocesses a value before it is set.
   */
  clean?: CleanFunction<T>

  autoValue?: (value: T, info: CurrentNodeInfo<T>, ...args: any[]) => T | Promise<T>

  /**
   * The minimum value if it's a number, the minimum length if it's a string or array.
   */
  min?: number

  /**
   * The maximum value if it's a number, the maximum length if it's a string or array.
   */
  max?: number

  /**
   * Internal use only.
   */
  isBlackboxChild?: boolean

  /**
   * Deprecated
   */
  custom?: ValidateFunction<T>
}

/**
 * It's the same as defining the object directly, but works better with TypeScript for type inference.
 */
export const asSchemaNode = <T extends SchemaNodeType>(schemaNode: SchemaNode<T>) => schemaNode

export type Schema = SchemaRecursiveType

export interface CurrentNodeInfoOptions {
  autoConvert?: boolean
  filter?: boolean
  trimStrings?: boolean
  removeEmptyStrings?: boolean
  forceDoc?: any
  omitRequired?: boolean
}

export interface CurrentNodeInfo<T extends SchemaNodeType, S extends SchemaNodeType = any> {
  /**
   * The global schema, prefaced by {type: {...}} to be compatible with subschemas
   * Sometimes it's given without {type: {...}}. TODO: Normalize this.
   */
  schema?: SchemaNode<T> | Schema
  /**
   * The current node subschema
   */
  currentSchema?: Partial<SchemaNode<S>>

  value: T
  doc?: T
  currentDoc?: T
  options?: CurrentNodeInfoOptions
  args?: any[]
  type?: SchemaMetaFieldType<T>
  keys?: string[]

  addError?: (keys: string[], code: string | object) => void
}
