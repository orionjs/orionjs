/* eslint-disable @typescript-eslint/ban-types */

import {FieldType} from '../fieldType'

export type Constructor<T> = new (...args: any[]) => T

export type FieldTypesList =
  | 'string'
  | 'date'
  | 'integer'
  | 'number'
  | 'ID'
  | 'boolean'
  | 'email'
  | 'blackbox'

export type ConstructorsTypesList =
  | Constructor<String>
  | Constructor<Number>
  | Constructor<Boolean>
  | Constructor<Date>

export type SchemaRecursiveNodeTypeExtras = {
  __clean?: CleanFunction
  __validate?: ValidateFunction
  __skipChildValidation?: (value: any, info: CurrentNodeInfo) => Promise<boolean>
}

export interface Schema {
  [key: string]: SchemaNode | Function
}

export type SchemaRecursiveNodeType = Schema & SchemaRecursiveNodeTypeExtras

export type SchemaMetaFieldTypeSingle =
  | FieldTypesList
  | ConstructorsTypesList
  | SchemaRecursiveNodeType
  | FieldType

export type SchemaMetaFieldType = SchemaMetaFieldTypeSingle | [SchemaMetaFieldTypeSingle]

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
