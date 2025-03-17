import {
  getFieldType,
  getSchemaWithMetadataFromAnyOrionForm,
  isSchemaLike,
  SchemaNode,
} from '@orion-js/schema'
import {isType, omit} from 'rambdax'
import getScalar from '../buildSchema/getType/getScalar'
import {getStaticFields} from './getStaticFields'

export default async function getParams(field: SchemaNode) {
  const {type} = field

  if (Array.isArray(type)) {
    const serialized = await getParams({...field, type: type[0]})
    return {
      ...serialized,
      type: [serialized.type],
      __graphQLType: `[${serialized.__graphQLType}]`,
    }
  }

  const isSchema = isSchemaLike(type)

  if (isSchema) {
    const schemaOfType = getSchemaWithMetadataFromAnyOrionForm(type)
    const modelName = schemaOfType.__modelName
    if (!modelName) {
      throw new Error('The schema needs a model name to be serialized for GraphQL')
    }

    const fields = {}

    for (const field of getStaticFields(schemaOfType)) {
      fields[field.key] = await getParams(field)
    }

    return {
      ...omit(['key'], field),
      type: fields,
      __graphQLType: `${modelName}Input`,
    }
  }

  const schemaType = getFieldType(type)
  const graphQLType = await getScalar(schemaType)

  const withoutKey = isType('Object', field) ? omit(['key'], field) : ({} as any)

  return {
    ...withoutKey,
    type: schemaType.name,
    __graphQLType: graphQLType.name,
  }
}
