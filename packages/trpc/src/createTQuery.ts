import {cleanAndValidate, clean, getSchemaFromAnyOrionForm, SchemaFieldType} from '@orion-js/schema'
import {TQuery, TQueryOptions} from './types'

export function createTQuery<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
>(options: TQueryOptions<TParams, TReturns, TViewer>): TQuery<TParams, TReturns, TViewer> {
  const params = options.params ? getSchemaFromAnyOrionForm(options.params) : undefined
  const returns = options.returns ? getSchemaFromAnyOrionForm(options.returns) : undefined

  const execute = async ({params: rawParams, viewer}: {params: any; viewer: TViewer}) => {
    const cleanedParams = params ? await cleanAndValidate(params, rawParams) : rawParams
    const result = await options.resolve(cleanedParams, viewer)
    const cleanedResult = returns ? await clean(returns, result) : result
    return cleanedResult
  }

  return {
    params: params as TParams,
    returns: returns as TReturns,
    mutation: false,
    resolve: options.resolve,
    execute,
  }
}
