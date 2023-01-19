import checkPermissions from './checkPermissions'
import cleanAndValidate from './cleanAndValidate'
import initResult from './initResult'
import getResult from './getResult'
import {ResolverOptions, Execute} from '../types'
import {getResultWithMiddlewares} from './getResultWithMiddlewares'

export default function getExecute(options: ResolverOptions) {
  const execute: Execute = async executeParams => {
    const executeOptions = {
      params: await cleanAndValidate({
        params: options.params,
        callParams: executeParams.params
      }),
      viewer: executeParams.viewer || {},
      parent: executeParams.parent
    }

    await checkPermissions(executeOptions, options)

    const result = await getResultWithMiddlewares(options, executeOptions)

    return initResult(options, result)
  }

  return execute
}
