import {type} from 'rambdax'
import {SchemaNode} from '../types/schema'

export default function getObjectNode(schema: Partial<SchemaNode>, value: any): SchemaNode {
  if (type(schema.type) === 'Object' && type(value) === 'Object') {
    const result = schema as any
    return result
  }

  return null
}
