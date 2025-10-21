import {clean, cleanAndValidate} from '@orion-js/schema'
import {runWithOrionAsyncContext} from '@orion-js/logger'
import {ResolverOptions, Execute, ExecuteOptions} from '../types'
import {getResultWithMiddlewares} from './getResultWithMiddlewares'

export default function getExecute(options: ResolverOptions) {
  const execute: Execute = async executeParams => {
    const executeContext: ExecuteOptions = {
      params: options.params
        ? await cleanAndValidate(options.params, executeParams.params ?? {})
        : (executeParams.params ?? {}),
      viewer: executeParams.viewer || {},
      info: executeParams.info || {},
      parent: executeParams.parent,
      options: options,
    }

    const result = executeContext.parent
      ? await runWithOrionAsyncContext(
          {
            controllerType: 'modelResolver' as const,
            viewer: executeContext.viewer,
            params: executeContext.params,
            parentData: executeContext.parent,
            modelResolverName: executeContext.options.resolverId,
          },
          async () => {
            return await getResultWithMiddlewares(executeContext)
          },
        )
      : await runWithOrionAsyncContext(
          {
            controllerType: 'resolver' as const,
            viewer: executeContext.viewer,
            params: executeContext.params,
            resolverName: executeContext.options.resolverId,
          },
          async () => {
            return await getResultWithMiddlewares(executeContext)
          },
        )

    if (options.returns) {
      return await clean(options.returns, result)
    }

    return result
  }

  return execute
}
