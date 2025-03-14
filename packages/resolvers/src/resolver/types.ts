import {OrionCache} from '@orion-js/cache'
import {Blackbox, InferSchemaType} from '@orion-js/schema'

export type GlobalResolverResolve<TParams = any, TReturns = any, TViewer = any, TInfo = any> = (
  params?: InferSchemaType<TParams>,
  viewer?: TViewer,
  info?: TInfo,
) => Promise<InferSchemaType<TReturns>>

export type ModelResolverResolve<
  TItem = any,
  TParams = any,
  TReturns = any,
  TViewer = any,
  TInfo = any,
> = (
  item?: TItem,
  params?: InferSchemaType<TParams>,
  viewer?: TViewer,
  info?: TInfo,
) => Promise<InferSchemaType<TReturns>>

export type GlobalCheckPermissions = (params: any, viewer: any, info?: any) => Promise<string>
export type ModelCheckPermissions = (
  parent: any,
  params: any,
  viewer: any,
  info?: any,
) => Promise<string>

export type GlobalGetCacheKey = (params: any, viewer: any, info: any) => Promise<any>
export type ModelGetCacheKey = (parent: any, params: any, viewer: any, info: any) => Promise<any>

export interface ExecuteOptions {
  params: Blackbox
  viewer: any
  parent?: any
  info?: any
  options: GlobalResolverOptions | ModelResolverOptions
}

type Parameters<T> = T extends (...args: infer P) => any ? P : never
type ReturnType<T> = T extends (...args: any) => infer R ? R : any

type ResolverParams<Resolve, IsModel> = IsModel extends undefined
  ? Parameters<Resolve>[0]
  : Parameters<Resolve>[1]

export interface ExecuteParams<Resolve = Function, IsModel = undefined> {
  params?: ResolverParams<Resolve, IsModel>
  viewer?: any
  parent?: IsModel extends undefined ? undefined : Parameters<Resolve>[0]
  info?: any
}

export type Execute<Resolve = Function, IsModel = undefined> = (
  executeOptions: ExecuteParams<Resolve, IsModel>,
) => ReturnType<Resolve>

export interface SharedResolverOptions<TParams = any, TReturns = any> {
  resolverId?: string
  params?: TParams
  returns?: TReturns
  mutation?: boolean
  private?: boolean
  checkPermission?: GlobalCheckPermissions | ModelCheckPermissions
  getCacheKey?: GlobalGetCacheKey | ModelGetCacheKey
  cache?: number
  cacheProvider?: OrionCache
  permissionsOptions?: any
  middlewares?: ResolverMiddleware[]
}

export type GlobalResolverOptions<
  TParams = any,
  TReturns = any,
  TViewer = any,
  TInfo = any,
> = SharedResolverOptions<TParams, TReturns> & {
  resolve: GlobalResolverResolve<TParams, TReturns, TViewer, TInfo>
}

export type ModelResolverOptions<
  TItem = any,
  TParams = any,
  TReturns = any,
  TViewer = any,
  TInfo = any,
> = SharedResolverOptions<TParams, TReturns> & {
  resolve: ModelResolverResolve<TItem, TParams, TReturns, TViewer, TInfo>
}

export type ResolverOptions<
  TParams = any,
  TReturns = any,
  TViewer = any,
  TInfo = any,
  TItem = any,
> =
  | GlobalResolverOptions<TParams, TReturns, TViewer, TInfo>
  | ModelResolverOptions<TItem, TParams, TReturns, TViewer, TInfo>

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never

export interface Resolver<Resolve = Function, IsModel = undefined> extends SharedResolverOptions {
  execute: Execute<Resolve, IsModel>
  resolve: Resolve
  modelResolve: IsModel extends undefined ? undefined : OmitFirstArg<Resolve>
}

export type ModelResolver<Resolve = Function> = Resolver<Resolve, true>

export interface PermissionCheckerOptions {
  resolver: GlobalResolverOptions | ModelResolverOptions
  parent: any
  params: any
  viewer: any
  info: any
}

export type PermissionChecker = (options: PermissionCheckerOptions) => Promise<string>

export type ResolverMiddleware = (
  executeOptions: ExecuteOptions,
  next: () => Promise<any>,
) => Promise<any>
