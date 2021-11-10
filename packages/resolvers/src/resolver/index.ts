import getExecute from './getExecute'
import cleanParams from './cleanParams'
import {generateId} from '@orion-js/helpers'
import {ResolverOptions, CreateResolver} from './types'
import {defaultCache} from '@orion-js/cache'
import {CreateModelResolver} from '..'
import cleanReturns from './cleanReturns'
import {getArgs} from './getArgs'

const createResolver = function (options) {
  options.params = cleanParams(options.params)
  options.returns = cleanReturns(options.returns)

  if (!options.cacheProvider) {
    options.cacheProvider = defaultCache
  }

  if (!options.resolverId) {
    options.resolverId = generateId()
  }

  const execute = getExecute(options)

  const resolve = async (...args) => {
    let {parent, params, viewer} = getArgs(...args)
    const executeOptions = {parent, params, viewer}
    return await execute(executeOptions)
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
