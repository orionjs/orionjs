import {FieldType} from '../fieldType'
import {InferSchemaType} from './fields'

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
  | 'any'

type AClass = abstract new (...args: any) => any
// @deprecated No more usage of typedschema
export type TypedSchemaOnSchema = AClass

export type ConstructorsTypesList =
  | Constructor<String>
  | Constructor<Number>
  | Constructor<Boolean>
  | Constructor<Date>
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | DateConstructor
  | String
  | Number
  | Boolean
  | Date

export type SchemaMetaFieldTypeSingleNonSchema = FieldTypesList | ConstructorsTypesList | FieldType

export type SchemaMetaFieldTypeSingle =
  | SchemaMetaFieldTypeSingleNonSchema
  | Schema
  | TypedSchemaOnSchema

export type SchemaFieldType = SchemaMetaFieldTypeSingle | SchemaMetaFieldTypeSingle[]
export type SchemaFieldTypeNonSchema =
  | SchemaMetaFieldTypeSingleNonSchema
  | SchemaMetaFieldTypeSingleNonSchema[]

export type ValidateFunction<TType = any> = (
  value: TType,
  info?: Partial<CurrentNodeInfo>,
  ...args: any[]
  // biome-ignore lint/suspicious/noConfusingVoidType: void is needed to allow the function to have no return clause
) => object | string | null | undefined | void | Promise<object | string | null | undefined | void>

export type CleanFunction<TType = any> = (
  value: TType,
  info?: Partial<CurrentNodeInfo>,
  ...args: any[]
) => TType | Promise<TType>

export type SchemaRecursiveNodeTypeExtras = {
  __isFieldType?: boolean
  __GraphQLType?: any
  __skipChildValidation?: (value: any, info: CurrentNodeInfo) => Promise<boolean>
}

export type SchemaNode<TFieldType extends SchemaFieldType = SchemaFieldType> = {
  /**
   * The type of the field. Used for type validations. Can also contain a subschema.
   */
  type: TFieldType

  /**
   * Defaults to false
   */
  optional?: boolean

  allowedValues?: Array<InferSchemaType<TFieldType>>

  defaultValue?:
    | ((
        info: CurrentNodeInfo,
        ...args: any[]
      ) => InferSchemaType<TFieldType> | Promise<InferSchemaType<TFieldType>>)
    | InferSchemaType<TFieldType>

  /**
   * Function that takes a value and returns an error message if there are any errors. Must return null or undefined otherwise.
   */
  validate?: ValidateFunction<InferSchemaType<TFieldType>>

  /**
   * Function that preprocesses a value before it is set.
   */
  clean?: CleanFunction<InferSchemaType<TFieldType>>

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
  fieldType?: string

  /**
   * The field options that will be passed as props to the front-end field
   */
  fieldOptions?: any
} & SchemaRecursiveNodeTypeExtras

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
  schema?: SchemaFieldType
  /**
   * The current node subschema
   */
  currentSchema?: Partial<SchemaNode<SchemaFieldType>>

  value: InferSchemaType<SchemaFieldType>
  doc?: any
  currentDoc?: any
  options?: CurrentNodeInfoOptions
  args?: any[]
  type?: SchemaFieldType
  keys?: string[]

  addError?: (keys: string[], code: string | object) => void
}

export type SchemaMetadata = {
  /**
   * The name of the model (to make it compatible with GraphQL)
   */
  __modelName?: string
  /**
   * Cleans the whole schema
   */
  __clean?: CleanFunction
  /**
   * Validates the whole schema
   */
  __validate?: ValidateFunction
  /**
   * The resolvers of the model
   */
  __resolvers?: any
}

export type Schema = {
  [K: string]: SchemaNode
}

export type SingleLevelSchema = {
  [K: string]: SchemaNode<SchemaFieldTypeNonSchema>
}

export type SchemaInAnyOrionForm = Schema | TypedSchemaOnSchema

export type SchemaWithMetadata = {
  [K: string]: SchemaNode | SchemaMetadata[keyof SchemaMetadata]
} & SchemaMetadata
