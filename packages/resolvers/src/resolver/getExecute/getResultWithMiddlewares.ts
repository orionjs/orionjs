import {composeMiddlewares} from '@orion-js/helpers'
import {createResolverMiddleware} from '../../createResolverMiddleware'
import {ExecuteOptions, ResolverOptions} from '../types'
import getResult from './getResult'

export async function getResultWithMiddlewares(
  options: ResolverOptions,
  executeOptions: ExecuteOptions
) {
  const resolveMiddleware = createResolverMiddleware(async (executeOptions, next) => {
    return await getResult(options, executeOptions)
  })

  const composedMiddlewares = composeMiddlewares([
    ...(options.middlewares || []),
    resolveMiddleware
  ])

  return await composedMiddlewares(executeOptions)
}
