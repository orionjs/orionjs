import getType from '../getType'
import getArgs from '../getArgs'
import errorHandler from '../../errorHandler'
import {resolversStore} from './resolversStore'
import {GraphQLFieldConfig, ThunkObjMap} from 'graphql'
import {StartGraphQLOptions} from '../../types/startGraphQL'
import {runWithOrionAsyncContext} from '@orion-js/logger'

export default async function (options: StartGraphQLOptions, mutation: boolean) {
  const {resolvers} = options
  const filteredResolvers = Object.keys(resolvers)
    .map(key => {
      return {
        name: key,
        resolver: resolvers[key],
      }
    })
    .filter(({resolver}) => !!resolver.mutation === !!mutation)
    .filter(({resolver}) => !resolver.private)

  const fields: ThunkObjMap<GraphQLFieldConfig<any, any, any>> = {}

  for (const {resolver, name} of filteredResolvers) {
    resolversStore[name] = resolver

    const type = await getType(resolver.returns, options)
    const args = await getArgs(resolver.params, options)

    fields[name] = {
      type,
      args,
      async resolve(_root, params, context, info) {
        try {
          return await runWithOrionAsyncContext(
            {
              controllerType: 'resolver' as const,
              viewer: context,
              params: params,
              resolverName: name,
            },
            async () => {
              return await resolver.resolve(params, context, info)
            },
          )
        } catch (error) {
          errorHandler(error, {context, resolver, options, name})
          throw error
        }
      },
    }
  }

  return fields
}
