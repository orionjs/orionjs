import getArgs from '../getArgs'
import errorHandler from '../../errorHandler'
import {runWithOrionAsyncContext} from '@orion-js/logger'

export default function ({resolver, getGraphQLType, options, schema}) {
  const type = getGraphQLType(resolver.returns, options)
  const args = getArgs(resolver.params, options)
  return {
    type,
    args,
    async resolve(item, params, context, info) {
      try {
        return await runWithOrionAsyncContext(
          {
            controllerType: 'modelResolver' as const,
            viewer: context,
            params: params,
            parentData: item,
            modelResolverName: resolver.key,
          },
          async () => {
            return await resolver.resolve(item, params, context, info)
          },
        )
      } catch (error) {
        errorHandler(error, {context, resolver, options, schema})
        throw error
      }
    },
  }
}
