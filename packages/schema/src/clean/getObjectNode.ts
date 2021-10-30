import isPlainObject from 'lodash/isPlainObject'
import {SchemaNode, SchemaNodeType, SchemaRecursiveNodeType} from '../types/schema'

export default function getObjectNode(schema: Partial<SchemaNode>, value: any): SchemaNode | void {
  if (isPlainObject(schema.type) && isPlainObject(value)) {
    const result = schema as SchemaNode
    return result
  }

  return null
}
