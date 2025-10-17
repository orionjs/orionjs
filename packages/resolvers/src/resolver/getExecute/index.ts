import {clean, cleanAndValidate} from '@orion-js/schema'
import {getOrionAsyncContext, runWithOrionAsyncContext} from '@orion-js/logger'
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

    const currentContext = getOrionAsyncContext()

    const context = currentContext
      ? {
          ...currentContext,
          viewer: executeContext.viewer,
          params: executeContext.params,
          parentData: executeContext.parent,
          modelResolverName: executeContext.parent
            ? executeContext.options.resolverId
            : currentContext.controllerType === 'modelResolver'
              ? currentContext.modelResolverName
              : undefined,
          resolverName:
            !executeContext.parent && currentContext.controllerType === 'resolver'
              ? executeContext.options.resolverId
              : currentContext.controllerType === 'resolver'
                ? currentContext.resolverName
                : undefined,
        }
      : {
          controllerType: executeContext.parent ? 'modelResolver' : 'resolver',
          viewer: executeContext.viewer,
          params: executeContext.params,
          parentData: executeContext.parent,
          modelResolverName: executeContext.parent ? executeContext.options.resolverId : undefined,
          resolverName: !executeContext.parent ? executeContext.options.resolverId : undefined,
        }

    const result = await runWithOrionAsyncContext(context, async () => {
      return await getResultWithMiddlewares(executeContext)
    })

    if (options.returns) {
      return await clean(options.returns, result)
    }

    return result
  }

  return execute
}
