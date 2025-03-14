import {Schema, SchemaNode, SchemaWithMetadata} from '@orion-js/schema'

export function getStaticFields(schema: Schema | SchemaWithMetadata): Array<SchemaNode> {
  if (!schema) return []

  // retrocompatibility with model
  if ((schema as any).getSchema) {
    schema = (schema as any).getSchema()
  }

  const keys = Object.keys(schema).filter(key => !key.startsWith('__'))

  return (
    keys
      .map((key): SchemaNode => {
        const field = schema[key] as SchemaNode
        return {
          ...field,
          key,
        } as SchemaNode
      })
      // there is a compile error if we don't do this
      .filter(field => !field.private)
  )
}
