import {GlobalResolverResolve, ModelResolverResolve} from '@orion-js/resolvers'
import {SchemaFieldType} from '@orion-js/schema'

export type InternalGlobalResolverResolveAtDecorator<This, TParams, TReturns, TViewer, TInfo> = (
  this: This,
  ...args: Parameters<GlobalResolverResolve<TParams, TReturns, TViewer, TInfo>>
) => ReturnType<GlobalResolverResolve<TParams, TReturns, TViewer, TInfo>>

export type InternalModelResolverResolveAtDecorator<
  This,
  TItem,
  TParams extends SchemaFieldType,
  TReturns extends SchemaFieldType,
  TViewer,
  TInfo,
> = (
  this: This,
  ...args: Parameters<ModelResolverResolve<TItem, TParams, TReturns, TViewer, TInfo>>
) => ReturnType<ModelResolverResolve<TItem, TParams, TReturns, TViewer, TInfo>>

export type DynamicResolverResolveAtDecorator<
  TParams extends SchemaFieldType,
  TReturns extends SchemaFieldType,
  TViewer,
  TItem,
  TInfo,
> = TItem extends undefined
  ? GlobalResolverResolve<TParams, TReturns, TViewer, TInfo>
  : ModelResolverResolve<TItem, TParams, TReturns, TViewer, TInfo>

export type InternalDynamicResolverResolveAtDecorator<
  This,
  TParams extends SchemaFieldType = any,
  TReturns extends SchemaFieldType = any,
  TViewer = any,
  TItem = any,
  TInfo = any,
> = TItem extends undefined
  ? InternalGlobalResolverResolveAtDecorator<This, TParams, TReturns, TViewer, TInfo>
  : InternalModelResolverResolveAtDecorator<This, TItem, TParams, TReturns, TViewer, TInfo>
