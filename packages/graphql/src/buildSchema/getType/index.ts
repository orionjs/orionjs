import {GraphQLList, GraphQLObjectType} from 'graphql'
import {
  getFieldType,
  getSchemaWithMetadataFromAnyOrionForm,
  isSchemaLike,
  Schema,
  SchemaFieldType,
  SchemaWithMetadata,
} from '@orion-js/schema'
import {equals} from 'rambdax'
import getScalar from './getScalar'
import getTypeAsResolver from './getTypeAsResolver'
import {getStaticFields} from '../../resolversSchemas/getStaticFields'
import {getDynamicFields} from '../../resolversSchemas/getDynamicFields'
import {getModelLoadedResolvers} from '../../resolversSchemas/getModelLoadedResolvers'
import {StartGraphQLOptions} from '../../types/startGraphQL'

const createGraphQLObjectType = (modelName: string, schema: Schema, options: StartGraphQLOptions) =>
  new GraphQLObjectType({
    name: modelName,
    fields: () => buildFields(schema, options),
  })

const buildFields = (schema: Schema, options: StartGraphQLOptions) => {
  const fields = {}

  const addStaticFields = () => {
    for (const field of getStaticFields(schema)) {
      try {
        fields[field.key] = field.graphQLResolver
          ? getTypeAsResolver({resolver: field.graphQLResolver, getGraphQLType, options, schema})
          : {type: getGraphQLType(field.type, options)}
      } catch (error) {
        throw new Error(`Error getting type for ${field.key}: ${error.message}`)
      }
    }
  }

  const addDynamicFields = () => {
    for (const resolver of getDynamicFields(schema)) {
      try {
        fields[resolver.key] = getTypeAsResolver({resolver, getGraphQLType, options, schema})
      } catch (error) {
        throw new Error(
          `Error getting resolver type for resolver \"${resolver.key}\": ${error.message}`,
        )
      }
    }
  }

  const addModelLoadedResolvers = () => {
    for (const resolver of getModelLoadedResolvers(schema, options)) {
      try {
        fields[resolver.key] = getTypeAsResolver({resolver, getGraphQLType, options, schema})
      } catch (error) {
        throw new Error(
          `Error getting resolver type for resolver \"${resolver.key}\": ${error.message}`,
        )
      }
    }
  }

  addStaticFields()
  addDynamicFields()
  addModelLoadedResolvers()

  return fields
}

// we'll save the list of models that have been registered
// to avoid duplicate registration of models.
// if two models have the same name, but are different,
// it will throw an error.
const registeredGraphQLTypes = new Map<
  string,
  {schema: SchemaWithMetadata; graphQLType: GraphQLObjectType}
>()

export default function getGraphQLType(type: SchemaFieldType, options: StartGraphQLOptions) {
  if (!type) throw new Error('Type is undefined')

  if (Array.isArray(type)) {
    return new GraphQLList(getGraphQLType(type[0], options))
  }

  if (isSchemaLike(type)) {
    const schema = getSchemaWithMetadataFromAnyOrionForm(type)
    const modelName = schema.__modelName

    if (schema.__graphQLType) {
      return schema.__graphQLType
    }

    if (!modelName) {
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

    const graphQLType = createGraphQLObjectType(modelName, schema as Schema, options)

    registeredGraphQLTypes.set(modelName, {schema, graphQLType})

    return graphQLType
  }

  return getScalar(getFieldType(type))
}
