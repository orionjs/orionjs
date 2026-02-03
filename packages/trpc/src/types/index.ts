import {InferSchemaType, SchemaFieldType} from '@orion-js/schema'

export interface TQueryOptions<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> {
  params?: TParams
  returns?: TReturns
  private?: boolean
  resolve: (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<InferSchemaType<TReturns>>
}

export interface TMutationOptions<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> {
  params?: TParams
  returns?: TReturns
  private?: boolean
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
  private?: boolean
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
  private?: boolean
  resolve: (params: InferSchemaType<TParams>, viewer: TViewer) => Promise<InferSchemaType<TReturns>>
  execute: (options: {params: any; viewer: TViewer}) => Promise<InferSchemaType<TReturns>>
}

export type TRPCProcedure<
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
> = TQuery<TParams, TReturns, TViewer> | TMutation<TParams, TReturns, TViewer>

export type TRPCProceduresMap = Record<string, TRPCProcedure<any, any, any>>
