import {InferSchemaType, SchemaFieldType} from '@orion-js/schema'

export interface TQueryOptions<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> {
  params?: TParams
  returns?: TReturns
  resolve: (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<InferSchemaType<TReturns>>
}

export interface TMutationOptions<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> {
  params?: TParams
  returns?: TReturns
  resolve: (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<InferSchemaType<TReturns>>
}

export interface TQuery<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> {
  params?: TParams
  returns?: TReturns
  mutation: false
  resolve: (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<InferSchemaType<TReturns>>
  execute: (options: {params: any; viewer: TViewer}) => Promise<InferSchemaType<TReturns>>
}

export interface TMutation<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> {
  params?: TParams
  returns?: TReturns
  mutation: true
  resolve: (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<InferSchemaType<TReturns>>
  execute: (options: {params: any; viewer: TViewer}) => Promise<InferSchemaType<TReturns>>
}

export type TRPCProcedure<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> = TQuery<TParams, TReturns, TViewer> | TMutation<TParams, TReturns, TViewer>

export type TRPCProceduresMap = Record<string, TRPCProcedure<any, any, any>>

/**
 * Infer the input type from a TQuery or TMutation procedure
 */
export type InferProcedureInput<T> = T extends TQuery<infer P, any, any>
  ? InferSchemaType<P>
  : T extends TMutation<infer P, any, any>
    ? InferSchemaType<P>
    : never

/**
 * Infer the output type from a TQuery or TMutation procedure
 */
export type InferProcedureOutput<T> = T extends TQuery<any, infer R, any>
  ? InferSchemaType<R>
  : T extends TMutation<any, infer R, any>
    ? InferSchemaType<R>
    : never
