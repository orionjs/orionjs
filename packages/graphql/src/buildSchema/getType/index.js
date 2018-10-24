import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {GraphQLList, GraphQLObjectType} from 'graphql'
import {getFieldType} from '@orion-js/schema'
import {Model} from '@orion-js/app'
import getScalar from './getScalar'
import getArgs from '../getArgs'

export default function getGraphQLType(type) {
  if (!type) {
    throw new Error('Type is undefined')
  }

  if (isArray(type)) {
    const graphQLType = getGraphQLType(type[0])
    return new GraphQLList(graphQLType)
  } else if (!type._isFieldType && (isPlainObject(type) || type instanceof Model)) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type if not a Model', type)
    if (model.graphQLType) return model.graphQLType

    model.graphQLType = new GraphQLObjectType({
      name: model.name,
      fields: () => {
        const fields = {}
        for (const field of model.staticFields) {
          try {
            fields[field.key] = {
              type: getGraphQLType(field.type)
            }
          } catch (error) {
            throw new Error(`Error getting type for ${field.key} ${error.message}`)
          }
        }

        for (const resolver of model.dynamicFields) {
          try {
            const type = getGraphQLType(resolver.returns)
            const args = getArgs(resolver.params)
            fields[resolver.key] = {
              type,
              args,
              async resolve(item, params, context) {
                try {
                  const result = await resolver.resolve(item, params, context)
                  return result
                } catch (error) {
                  console.error(
                    'Error at resolver "' + resolver.key + '" of model "' + model.name + '":'
                  )
                  throw error
                }
              }
            }
          } catch (error) {
            throw new Error(
              `Error getting resolver type for resolver "${resolver.key}": ${error.message}`
            )
          }
        }
        return fields
      }
    })

    return model.graphQLType
  } else {
    const schemaType = getFieldType(type)
    const graphQLType = getScalar(schemaType)
    return graphQLType
  }
}
