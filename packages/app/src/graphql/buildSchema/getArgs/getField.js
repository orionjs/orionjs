import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {GraphQLList, GraphQLInputObjectType} from 'graphql'
import {getFieldType} from '@orion-js/schema'
import Model from '../../../Model'
import getScalar from '../getType/getScalar'

export default async function getParams(type) {
  if (isArray(type)) {
    const graphQLType = await getParams(type[0])
    return new GraphQLList(graphQLType)
  } else if (isPlainObject(type) || type instanceof Model) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type if not a Model', type)

    const fields = {}

    for (const field of model.staticFields) {
      fields[field.key] = {
        type: await getParams(field.type)
      }
    }

    return new GraphQLInputObjectType({
      name: model.name + 'Input',
      fields
    })
  } else {
    const schemaType = await getFieldType(type)
    const graphQLType = await getScalar(schemaType)
    return graphQLType
  }
}
