/* eslint-disable @typescript-eslint/ban-types */

import {FieldType} from '../fieldType'

export type Constructor<T> = new (...args: any[]) => T

export type Blackbox = {[name: string]: any}

export type FieldTypesList =
  | 'string'
  | 'date'
  | 'integer'
  | 'number'
  | 'ID'
  | 'boolean'
  | 'email'
  | 'blackbox'

export type TypedModelOnSchema = Function

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
  | TypedModelOnSchema

export type SchemaMetaFieldType = SchemaMetaFieldTypeSingle | SchemaMetaFieldTypeSingle[]

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
   * @deprecated
   */
  custom?: ValidateFunction

  /**
   * Used in GraphQL. If true, the field will be omitted from the schema.
   */
  private?: boolean

  /**
   * Used in GraphQL. When in GraphQL, this resolver will replace the static field.
   */
  graphQLResolver?: (...args: any) => any

  /**
   * Used in GraphQL. Sets the key of the field in the GraphQL schema. You must set this value when building your schema.
   */
  key?: string

  /**
   * The name that would be displayed in a front-end form
   */
  label?: string

  /**
   * The description that would be displayed in a front-end form
   */
  description?: string

  /**
   * The placeholder that would be displayed in a front-end form
   */
  placeholder?: string

  /**
   * The field type that would be used in a front-end form
   */
  fieldType?: string //TODO: allow only possible values

  /**
   * The field options that will be passed as props to the front-end field
   */
  fieldOptions?: any
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
