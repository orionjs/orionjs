import getExecute from './getExecute'
import cleanParams from './cleanParams'
import {generateId} from '@orion-js/helpers'
import {CreateResolver} from './types'
import {defaultCache} from '@orion-js/cache'
import {CreateModelResolver} from '..'
import cleanReturns from './cleanReturns'
import {getArgs} from './getArgs'

function createResolver(options: any) {
  options.params = cleanParams(options.params)
  options.returns = cleanReturns(options.returns)

  if (!options.cacheProvider) {
    options.cacheProvider = defaultCache
  }

  if (!options.resolverId) {
    options.resolverId = generateId()
  }

  if (!options.middlewares) {
    options.middlewares = []
  }

  const execute = getExecute(options)

  const resolve = async (...args: any[]) => {
    const params: any = getArgs(...args)
    return await execute(params)
  }

  const resolver = {
    ...options,
    resolve,
    execute
  }

  return resolver
}

const resolver: CreateResolver = createResolver
const modelResolver: CreateModelResolver = createResolver

export {resolver, modelResolver}
