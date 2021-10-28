import isPlainObject from 'lodash/isPlainObject'
import {SchemaNode, SchemaNodeType, SchemaRecursiveNodeType} from '../types/schema'

export default function getObjectNode<T extends SchemaNodeType>(
  schema: Partial<SchemaNode<T>>,
  value: T | T[]
): SchemaNode<object> | void {
  if (isPlainObject(schema.type) && isPlainObject(value)) {
    const result = schema as SchemaNode<object>
    return result
  }

  return null
}
