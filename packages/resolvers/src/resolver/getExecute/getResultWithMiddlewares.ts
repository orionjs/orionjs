import {composeMiddlewares} from '@orion-js/helpers'
import {createResolverMiddleware} from '../../createResolverMiddleware'
import {ExecuteOptions} from '../types'
import getResult from './getResult'

export async function getResultWithMiddlewares(executeOptions: ExecuteOptions) {
  const resolveMiddleware = createResolverMiddleware(async executeOptions => {
    return await getResult(executeOptions)
  })

  const composedMiddlewares = composeMiddlewares([
    ...(executeOptions.options.middlewares || []),
    resolveMiddleware,
  ])

  return await composedMiddlewares(executeOptions)
}
