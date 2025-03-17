import getExecute from './getExecute'
import {generateId} from '@orion-js/helpers'
import {GlobalResolverOptions, ModelResolver, ModelResolverOptions, GlobalResolver} from './types'
import {getResolverArgs} from './getArgs'
import {getSchemaFromAnyOrionForm, SchemaFieldType} from '@orion-js/schema'

function dynamicCreateResolver(options: any) {
  options.params = getSchemaFromAnyOrionForm(options.params)
  options.returns = getSchemaFromAnyOrionForm(options.returns)

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
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
  TInfo = any,
>(
  options: GlobalResolverOptions<TParams, TReturns, TViewer, TInfo>,
): GlobalResolver<TParams, TReturns, TViewer, TInfo> => {
  return dynamicCreateResolver(options)
}

const createModelResolver = <
  TItem = any,
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
  TInfo = any,
>(
  options: ModelResolverOptions<TItem, TParams, TReturns, TViewer, TInfo>,
): ModelResolver<TItem, TParams, TReturns, TViewer, TInfo> => {
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
