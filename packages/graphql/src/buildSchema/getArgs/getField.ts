import {GraphQLInputObjectType, GraphQLList} from 'graphql'
import {
  getFieldType,
  getSchemaWithMetadataFromAnyOrionForm,
  isSchemaLike,
  Schema,
  SchemaWithMetadata,
} from '@orion-js/schema'
import getScalar from '../getType/getScalar'
import {equals} from 'rambdax'
import {StartGraphQLOptions} from '../../types'
import {getStaticFields} from '../../resolversSchemas/getStaticFields'

// we'll save the list of models that have been registered
// to avoid duplicate registration of models.
// if two models have the same name, but are different,
// it will throw an error.
const registeredGraphQLTypes = new Map<
  string,
  {schema: SchemaWithMetadata; graphQLType: GraphQLInputObjectType}
>()

const resolveType = (type, options: StartGraphQLOptions) => {
  if (!type) throw new Error('No type specified')

  if (type?.[Symbol.metadata]?._getModel) {
    const model = type[Symbol.metadata]._getModel()
    return resolveType(model, options)
  }

  if (Array.isArray(type)) {
    return new GraphQLList(resolveType(type[0], options))
  }

  if (isSchemaLike(type)) {
    const schema = getSchemaWithMetadataFromAnyOrionForm(type)
    const modelName = `${schema.__modelName}Input`

    if (schema.__graphQLType) {
      return schema.__graphQLType
    }

    if (!schema.__modelName) {
      throw new Error(
        `Schema name is not defined. Register a name with schemaWithName. Schema: ${JSON.stringify(schema)}`,
      )
    }

    if (registeredGraphQLTypes.has(modelName)) {
      const {graphQLType, schema: registeredSchema} = registeredGraphQLTypes.get(modelName)
      if (equals(registeredSchema, schema)) {
        return graphQLType
      }
      throw new Error(`Schema named "${modelName}" already registered`)
    }

    const graphQLType = createGraphQLInputType(modelName, schema as Schema, options)

    registeredGraphQLTypes.set(modelName, {schema, graphQLType})

    return graphQLType
  }

  const schemaType = getFieldType(type)
  return getScalar(schemaType)
}

export default resolveType

export const createGraphQLInputType = (
  modelName: string,
  schema: Schema,
  options: StartGraphQLOptions,
) =>
  new GraphQLInputObjectType({
    name: modelName,
    fields: () => buildFields(schema, options),
  })

const buildFields = (schema: Schema, options: StartGraphQLOptions) => {
  const fields = {}

  const addStaticFields = () => {
    for (const field of getStaticFields(schema)) {
      try {
        fields[field.key] = {type: resolveType(field.type, options)}
      } catch (error) {
        throw new Error(`Error getting type for ${field.key}: ${error.message}`)
      }
    }
  }

  addStaticFields()

  return fields
}
