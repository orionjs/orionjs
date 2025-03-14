import {type} from 'rambdax'
import {SchemaNode} from '../types/schema'

export default function getObjectNode(schema: Partial<SchemaNode>, value: any): SchemaNode | void {
  if (type(schema.type) === 'Object' && type(value) === 'Object') {
    const result = schema as SchemaNode
    return result
  }

  return null
}
