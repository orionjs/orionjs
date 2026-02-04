import {cleanAndValidate, clean, getSchemaFromAnyOrionForm, SchemaFieldType, InferSchemaType} from '@orion-js/schema'
import {t, TRPCContext} from './trpc'
import {mapErrorToTRPCError} from './errorHandler'

export interface TMutationOptions<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
  TResolve extends (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<any> = (
    params: InferSchemaType<TParams>,
    viewer: TViewer,
  ) => Promise<InferSchemaType<TReturns>>,
> {
  params?: TParams
  returns?: TReturns
  resolve: TResolve
}

export function createTMutation<
  TParams extends SchemaFieldType,
  TReturns extends SchemaFieldType,
  TViewer = any,
  TResolve extends (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<any> = (
    params: InferSchemaType<TParams>,
    viewer: TViewer,
  ) => Promise<InferSchemaType<TReturns>>,
>(options: TMutationOptions<TParams, TReturns, TViewer, TResolve>) {
  const paramsSchema = options.params ? getSchemaFromAnyOrionForm(options.params) : undefined
  const returnsSchema = options.returns ? getSchemaFromAnyOrionForm(options.returns) : undefined

  type Input = InferSchemaType<TParams>
  type Output = Awaited<ReturnType<TResolve>>

  return t.procedure
    .input((val: unknown) => val as Input)
    .mutation(async ({ctx, input}): Promise<Output> => {
      try {
        const cleanedInput = paramsSchema
          ? await cleanAndValidate(paramsSchema, input)
          : (input ?? {})
        const result = await options.resolve(cleanedInput, ctx.viewer as TViewer)
        const cleanedResult = returnsSchema ? await clean(returnsSchema, result) : result
        return cleanedResult as Output
      } catch (error) {
        throw mapErrorToTRPCError(error as Error)
      }
    })
}
