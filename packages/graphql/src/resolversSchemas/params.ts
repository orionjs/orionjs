import {createResolver} from '@orion-js/resolvers'
import {UserError} from '@orion-js/helpers'
import ResolverParams from './ResolverParamsInfo'
import {resolversStore} from '../buildSchema/getResolvers/resolversStore'
import serializeSchema from './serializeSchema'
import {getSchemaFromAnyOrionForm, isSchemaLike, Schema, SchemaFieldType} from '@orion-js/schema'
import getBasicResultQuery from './getBasicResultQuery'

function getResultTypeName(type: SchemaFieldType) {
  const returns = Array.isArray(type) ? type[0] : type
  const schema = getSchemaFromAnyOrionForm(returns)
  if (schema?.__modelName) return schema.__modelName
  return
}

async function getInternalBasicResultQuery(type: SchemaFieldType) {
  const returns = Array.isArray(type) ? type[0] : type

  if (isSchemaLike(returns)) {
    const schema = getSchemaFromAnyOrionForm(returns) as Schema
    return await getBasicResultQuery({
      type: schema,
    })
  }
  return ''
}

export default createResolver({
  params: {
    name: {
      type: 'ID',
    },
    mutation: {
      type: Boolean,
    },
  },
  returns: ResolverParams,
  mutation: false,
  async resolve({mutation, name}) {
    const resolver = resolversStore[name]
    if (!resolver) {
      throw new UserError(
        'notFound',
        `${mutation ? 'Mutation' : 'Query'} named "${name}" not found`,
      )
    }
    if (!!resolver.mutation !== !!mutation) {
      throw new UserError('incorrectType', `"${name}" is ${mutation ? 'not' : ''} a mutation`)
    }

    return {
      name,
      basicResultQuery: await getInternalBasicResultQuery(resolver.returns),
      params: await serializeSchema(resolver.params),
      result: getResultTypeName(resolver.returns),
    }
  },
})
