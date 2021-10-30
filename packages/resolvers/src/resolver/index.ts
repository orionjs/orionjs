import getExecute from './getExecute'
import cleanParams from './cleanParams'
import {generateId} from '@orion-js/helpers'
import {ResolverOptions, Resolver} from './ResolverTypes'
import {defaultCache} from '@orion-js/cache'
import omit from 'lodash/omit'

export default function resolver(options: ResolverOptions): Resolver {
  options.params = cleanParams(options.params)

  if (!options.cacheProvider) {
    options.cacheProvider = defaultCache
  }

  if (!options.resolverId) {
    options.resolverId = generateId()
  }

  return {
    ...omit(options, 'resolve'),
    execute: getExecute(options)
  }
}
