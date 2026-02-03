import {cleanAndValidate, clean, getSchemaFromAnyOrionForm, SchemaFieldType, InferSchemaType} from '@orion-js/schema'
import {procedure, TRPCContext} from './trpc'
import {mapErrorToTRPCError} from './errorHandler'

export interface TQueryOptions<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> {
  params?: TParams
  returns?: TReturns
  resolve: (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<InferSchemaType<TReturns>>
}

export function createTQuery<
  TParams extends SchemaFieldType,
  TReturns extends SchemaFieldType,
  TViewer = any,
>(options: TQueryOptions<TParams, TReturns, TViewer>) {
  const paramsSchema = options.params ? getSchemaFromAnyOrionForm(options.params) : undefined
  const returnsSchema = options.returns ? getSchemaFromAnyOrionForm(options.returns) : undefined

  type Input = InferSchemaType<TParams>
  type Output = InferSchemaType<TReturns>

  return procedure
    .input((val: unknown) => val as Input)
    .query(async ({ctx, input}): Promise<Output> => {
      try {
        const cleanedInput = paramsSchema ? await cleanAndValidate(paramsSchema, input) : input
        const result = await options.resolve(cleanedInput, ctx.viewer as TViewer)
        const cleanedResult = returnsSchema ? await clean(returnsSchema, result) : result
        return cleanedResult as Output
      } catch (error) {
        throw mapErrorToTRPCError(error as Error)
      }
    })
}
