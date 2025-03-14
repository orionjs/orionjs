import getExecute from './getExecute'
import cleanParams from './cleanParams'
import {generateId} from '@orion-js/helpers'
import {
  GlobalResolverOptions,
  GlobalResolverResolve,
  ModelResolver,
  ModelResolverOptions,
  ModelResolverResolve,
  Resolver,
} from './types'
import {defaultCache} from '@orion-js/cache'
import cleanReturns from './cleanReturns'
import {getResolverArgs} from './getArgs'
import {SchemaFieldType} from '@orion-js/schema'

function dynamicCreateResolver(options: any) {
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
    const params: any = getResolverArgs(...args)
    return await execute(params)
  }

  const resolver = {
    ...options,
    resolve,
    execute,
  }

  return resolver
}

const createResolver = <
  TParams extends SchemaFieldType = SchemaFieldType,
  TReturns extends SchemaFieldType = SchemaFieldType,
  TViewer = any,
  TInfo = any,
>(
  options: GlobalResolverOptions<TParams, TReturns, TViewer, TInfo>,
): Resolver<GlobalResolverResolve<TParams, TReturns, TViewer, TInfo>> => {
  return dynamicCreateResolver(options)
}

const createModelResolver = <
  TItem = any,
  TParams extends SchemaFieldType = SchemaFieldType,
  TReturns extends SchemaFieldType = SchemaFieldType,
  TViewer = any,
  TInfo = any,
>(
  options: ModelResolverOptions<TItem, TParams, TReturns, TViewer, TInfo>,
): ModelResolver<ModelResolverResolve<TItem, TParams, TReturns, TViewer, TInfo>> => {
  return dynamicCreateResolver(options)
}

/**
 * @deprecated Use createResolver and createModelResolver instead
 */
const resolver = createResolver

/**
 * @deprecated Use createResolver and createModelResolver instead
 */
const modelResolver = createModelResolver

export {createResolver, createModelResolver, resolver, modelResolver}
