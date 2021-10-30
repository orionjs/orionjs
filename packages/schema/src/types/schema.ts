/* eslint-disable @typescript-eslint/ban-types */

export type Constructor<T> = new (...args: any[]) => T

export type SpecialSchemaString = 'ID' | 'email' | 'string'
export type SpecialSchemaNumber = 'number' | 'integer'
export type SpecialSchemaObject = 'blackbox'

export type SchemaRecursiveNodeTypeExtras = {
  __clean?: CleanFunction
  __validate?: ValidateFunction
  __skipChildValidation?: (value: any, info: CurrentNodeInfo) => Promise<boolean>
}

export type SchemaRecursiveType = {
  [key: string]: SchemaNode | Function
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

export type SchemaMetaFieldType =
  | SchemaNodeType
  | StringAllowedTypeValues
  | NumberAllowedTypeValues
  | ObjectAllowedTypeValues

export type ValidateFunction = (
  value: any,
  info?: Partial<CurrentNodeInfo>,
  ...args: any[]
) => object | string | void | Promise<object | string | void>
export type CleanFunction = (
  value: any,
  info?: Partial<CurrentNodeInfo>,
  ...args: any[]
) => any | Promise<any>

export interface SchemaNode {
  /**
   * The type of the field. Used for type validations. Can also contain a subschema.
   */
  type: SchemaMetaFieldType

  /**
   * Defaults to false
   */
  optional?: boolean

  allowedValues?: Array<any>

  defaultValue?: ((info: CurrentNodeInfo, ...args: any[]) => any | Promise<any>) | any

  /**
   * Function that takes a value and returns an error message if there are any errors. Must return null or undefined otherwise.
   */
  validate?: ValidateFunction

  /**
   * Function that preprocesses a value before it is set.
   */
  clean?: CleanFunction

  autoValue?: (value: any, info: CurrentNodeInfo, ...args: any[]) => any | Promise<any>

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
  custom?: ValidateFunction
}

export type Schema = SchemaRecursiveType

export interface CurrentNodeInfoOptions {
  autoConvert?: boolean
  filter?: boolean
  trimStrings?: boolean
  removeEmptyStrings?: boolean
  forceDoc?: any
  omitRequired?: boolean
}

export interface CurrentNodeInfo {
  /**
   * The global schema, prefaced by {type: {...}} to be compatible with subschemas
   * Sometimes it's given without {type: {...}}. TODO: Normalize this.
   */
  schema?: SchemaNode | Schema
  /**
   * The current node subschema
   */
  currentSchema?: Partial<SchemaNode>

  value: any
  doc?: any
  currentDoc?: any
  options?: CurrentNodeInfoOptions
  args?: any[]
  type?: SchemaMetaFieldType
  keys?: string[]

  addError?: (keys: string[], code: string | object) => void
}
