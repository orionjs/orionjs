import {GraphQLList, GraphQLInputObjectType} from 'graphql'
import {getFieldType, getSchemaFromAnyOrionForm} from '@orion-js/schema'
import getScalar from '../getType/getScalar'
import {getStaticFields} from '../../resolversSchemas/getStaticFields'
import {isType} from 'rambdax'

// @ts-ignore polyfill for Symbol.metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

const storedModelInput = {}

const getCachedModelInput = (model, fields) => {
  if (!storedModelInput[model.name]) {
    storedModelInput[model.name] = new GraphQLInputObjectType({
      name: `${model.name}Input`,
      fields,
    })
  }

  return storedModelInput[model.name]
}

const resolveModelFields = model => {
  const fields = {}

  for (const field of getStaticFields(model)) {
    fields[field.key] = {type: resolveType(field.type)}
  }

  return fields
}

const resolveArrayType = type => new GraphQLList(resolveType(type[0]))

const resolvePlainObjectOrModelType = type => {
  const model = getSchemaFromAnyOrionForm(type)

  const fields = resolveModelFields(model)
  return getCachedModelInput(model, fields)
}

const resolveType = type => {
  if (!type) throw new Error('No type specified')

  if (type?.[Symbol.metadata]?._getModel) {
    const model = type[Symbol.metadata]._getModel()
    return resolveType(model)
  }

  if (Array.isArray(type)) return resolveArrayType(type)

  if (!type.__isFieldType && (isType('Object', type) || type.__isModel)) {
    return resolvePlainObjectOrModelType(type)
  }

  const schemaType = getFieldType(type)
  return getScalar(schemaType)
}

export default resolveType
