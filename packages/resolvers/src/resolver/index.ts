import getExecute from './getExecute'
import cleanParams from './cleanParams'
import {generateId} from '@orion-js/helpers'
import {ResolverOptions, CreateResolver, Resolver} from './types'
import {defaultCache} from '@orion-js/cache'

const resolver: CreateResolver = function <ResolveFunction>(options: ResolverOptions) {
  options.params = cleanParams(options.params)

  if (!options.cacheProvider) {
    options.cacheProvider = defaultCache
  }

  if (!options.resolverId) {
    options.resolverId = generateId()
  }

  const resolve = options.resolve as unknown as ResolveFunction

  const resolver = {
    ...options,
    resolve,
    execute: getExecute(options)
  }

  return resolver
}

export default resolver
