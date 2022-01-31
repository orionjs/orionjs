import getType from '../getType'
import getArgs from '../getArgs'
import errorHandler from '../../errorHandler'
import {resolversStore} from './resolversStore'
import {GraphQLFieldConfig, GraphQLObjectType, ThunkObjMap} from 'graphql'

export default async function ({resolvers, mutation, options}) {
  const filteredResolvers = Object.keys(resolvers)
    .map(key => {
      return {
        name: key,
        resolver: resolvers[key]
      }
    })
    .filter(({resolver}) => !!resolver.mutation === !!mutation)
    .filter(({resolver}) => !resolver.private)

  const fields: ThunkObjMap<GraphQLFieldConfig<any, any, any>> = {}

  for (const {resolver, name} of filteredResolvers) {
    resolversStore[name] = resolver

    const type = await getType(resolver.returns, options)
    const args = await getArgs(resolver.params)

    fields[name] = {
      type,
      args,
      async resolve(root, params, context) {
        try {
          const result = await resolver.resolve(params, context)
          return result
        } catch (error) {
          errorHandler(error, {context, resolver, options, name})
          throw error
        }
      }
    }
  }

  return fields
}
