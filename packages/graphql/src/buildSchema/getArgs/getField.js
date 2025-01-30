import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {GraphQLList, GraphQLInputObjectType} from 'graphql'
import {getFieldType} from '@orion-js/schema'
import getScalar from '../getType/getScalar'
import isModel from '../isModel'

const storedModelInput = {}

const getModelInput = function getField(model, fields) {
  if (storedModelInput[model.name]) {
    return storedModelInput[model.name]
  }

  storedModelInput[model.name] = new GraphQLInputObjectType({
    name: `${model.name}Input`,
    fields
  })

  return storedModelInput[model.name]
}

export default function getParams(type) {
  if (!type) {
    throw new Error('No type specified')
  }

  if (isArray(type)) {
    const graphQLType = getParams(type[0])
    return new GraphQLList(graphQLType)
  } 
   if (!type._isFieldType && (isPlainObject(type) || isModel(type) )) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type if not a Model', type)

    const fields = {}

    for (const field of model.staticFields) {
      fields[field.key] = {
        type: getParams(field.type)
      }
    }

    return getModelInput(model, fields)
  } 
    const schemaType = getFieldType(type)
    const graphQLType = getScalar(schemaType)
    return graphQLType
  
}
