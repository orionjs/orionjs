import {runWithOrionAsyncContext} from '@orion-js/logger'
import {GraphQLFieldConfig, ThunkObjMap} from 'graphql'
import errorHandler from '../../errorHandler'
import {StartGraphQLOptions} from '../../types/startGraphQL'
import getArgs from '../getArgs'
import getType from '../getType'
import {resolversStore} from './resolversStore'

export default async function (options: StartGraphQLOptions, mutation: boolean) {
  const {resolvers} = options
  const fields: ThunkObjMap<GraphQLFieldConfig<any, any, any>> = {}

  for (const name of Object.keys(resolvers)) {
    const resolver = resolvers[name]
    if (!!resolver.mutation !== !!mutation) {
      continue
    }
    if (resolver.private) {
      continue
    }

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
