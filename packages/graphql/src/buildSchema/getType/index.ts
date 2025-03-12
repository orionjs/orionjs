import isArray from 'lodash/isArray'
import {GraphQLList, GraphQLObjectType} from 'graphql'
import {getFieldType, getSchemaFromAnyOrionForm, isSchemaLike, Schema} from '@orion-js/schema'
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

export default function getGraphQLType(type: Schema, options: StartGraphQLOptions) {
  if (!type) throw new Error('Type is undefined')

  if (isArray(type)) {
    return new GraphQLList(getGraphQLType(type[0], options))
  }

  if (!type.__isFieldType && isSchemaLike(type)) {
    const schema = getSchemaFromAnyOrionForm(type)
    const modelName = schema.__modelName

    if (schema.__graphQLType) {
      return schema.__graphQLType
    }

    console.log('getting type', {type, schema})

    if (!modelName) {
      throw new Error('Schema model name is not defined')
    }

    return createGraphQLObjectType(modelName, schema, options)
  }

  return getScalar(getFieldType(type))
}
