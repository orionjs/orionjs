import {Schema, SchemaNode} from '@orion-js/schema'

export function getStaticFields(schema: Schema): Array<SchemaNode> {
  if (!schema) return []

  // retrocompatibility with model
  if ((schema as any).getSchema) {
    schema = (schema as any).getSchema()
  }

  const keys = Object.keys(schema).filter(key => !key.startsWith('__'))

  return (
    keys
      .map((key): SchemaNode => {
        const field = schema[key]
        return {
          ...field,
          key,
        } as SchemaNode
      })
      // there is a compile error if we don't do this
      .filter(field => !field.private)
  )
}
