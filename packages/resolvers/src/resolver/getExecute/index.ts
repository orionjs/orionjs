import {clean, cleanAndValidate} from '@orion-js/schema'
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

    const result = await getResultWithMiddlewares(executeContext)

    if (options.returns) {
      return await clean(options.returns, result)
    }

    return result
  }

  return execute
}
