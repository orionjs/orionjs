import {getSchemaFromAnyOrionForm, isSchemaLike, Schema} from '@orion-js/schema'
import {clone} from '@orion-js/helpers'

function getType(type: any) {
  if (Array.isArray(type)) {
    return [getType(type[0])]
  }

  if (isSchemaLike(type)) {
    return getSchemaFromAnyOrionForm(type)
  }

  return type
}

export default function getSchema(resolverParams: any) {
  const schema: Schema = {}

  for (const key of Object.keys(resolverParams)) {
    const field = clone(resolverParams[key])
    if (!field) continue

    field.type = getType(field.type)

    schema[key] = field
  }

  return schema
}
