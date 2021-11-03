import {Model} from '@orion-js/models'
import {SchemaNode} from '@orion-js/schema'

export function getStaticFields(model: Model): Array<SchemaNode> {
  const schema = model.getSchema()
  if (!schema) return []

  const keys = Object.keys(schema).filter(key => !key.startsWith('__'))

  return (
    keys
      .map((key): SchemaNode => {
        const field = schema[key]
        return {
          ...field,
          key
        } as SchemaNode
      })
      // there is a compile error if we don't do this
      .filter(field => !field.private)
  )
}
