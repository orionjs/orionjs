import {getStaticFields} from './getStaticFields'
import {getSchemaFromAnyOrionForm, isSchemaLike, Schema, SchemaNode} from '@orion-js/schema'

export default async function getBasicQuery(field: SchemaNode) {
  if (!field.type) return ''

  if (Array.isArray(field.type)) {
    return getBasicQuery({
      ...field,
      type: field.type[0],
    })
  }

  if (!isSchemaLike(field.type)) {
    return field.key
  }

  const schema = getSchemaFromAnyOrionForm(field.type) as Schema

  const fields = []
  for (const field of getStaticFields(schema)) {
    fields.push(await getBasicQuery(field))
  }

  const key = field.key ? `${field.key} ` : ''

  return `${key}{ ${fields.join(' ')} }`
}
