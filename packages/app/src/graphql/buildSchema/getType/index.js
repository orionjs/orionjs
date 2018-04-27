import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {GraphQLList, GraphQLObjectType} from 'graphql'
import {getFieldType} from '@orion-js/schema'
import Model from '../../../Model'
import getScalar from './getScalar'

export default async function getGraphQLType(type) {
  if (isArray(type)) {
    const graphQLType = await getGraphQLType(type[0])
    return new GraphQLList(graphQLType)
  } else if (isPlainObject(type) || type instanceof Model) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type if not a Model', type)

    const fields = {}

    for (const field of model.staticFields) {
      fields[field.key] = {
        type: await getGraphQLType(field.type)
      }
    }

    for (const resolver of model.dynamicFields) {
      const type = await getGraphQLType(resolver.returns)
      fields[resolver.key] = {
        type,
        async resolve(item, params, context) {
          const result = await resolver.resolve(item, params, context)
          return result
        }
      }
    }

    return new GraphQLObjectType({
      name: model.name,
      fields
    })
  } else {
    const schemaType = await getFieldType(type)
    const graphQLType = await getScalar(schemaType)
    return graphQLType
  }
}
