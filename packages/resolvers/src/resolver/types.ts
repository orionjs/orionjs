import {OrionCache} from '@orion-js/cache'
import {Blackbox} from '@orion-js/schema'

export type GlobalResolverResolve = (params: any, viewer: any, info?: any) => Promise<any>
export type ModelResolverResolve = (item: any, params: any, viewer: any, info?: any) => Promise<any>

export type GlobalCheckPermissions = (
  params: any,
  viewer: any,
  info?: any,
) => Promise<string | void>
export type ModelCheckPermissions = (
  parent: any,
  params: any,
  viewer: any,
  info?: any,
) => Promise<string | void>

export type GlobalGetCacheKey = (params: any, viewer: any, info: any) => Promise<any>
export type ModelGetCacheKey = (parent: any, params: any, viewer: any, info: any) => Promise<any>

export interface ExecuteOptions {
  params: Blackbox
  viewer: any
  parent?: any
  info?: any
  options: ResolverOptions
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

export interface SharedResolverOptions {
  resolverId?: string
  params?: any
  returns?: any
  mutation?: boolean
  private?: boolean
  checkPermission?: GlobalCheckPermissions | ModelCheckPermissions
  getCacheKey?: GlobalGetCacheKey | ModelGetCacheKey
  cache?: number
  cacheProvider?: OrionCache
  permissionsOptions?: any
  middlewares?: ResolverMiddleware[]
}

export interface ResolverOptions<Resolve = Function> extends SharedResolverOptions {
  resolve: Resolve
}

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never

export interface Resolver<Resolve = Function, IsModel = undefined> extends SharedResolverOptions {
  execute: Execute<Resolve, IsModel>
  resolve: Resolve
  modelResolve: IsModel extends undefined ? undefined : OmitFirstArg<Resolve>
}

export type ModelResolver<Resolve = Function> = Resolver<Resolve, true>

export type CreateResolver = <Resolve extends GlobalResolverResolve>(
  options: ResolverOptions<Resolve>,
) => Resolver<Resolve>

export type CreateModelResolver = <Resolve extends ModelResolverResolve>(
  options: ResolverOptions<Resolve>,
) => ModelResolver<Resolve>

export interface PermissionCheckerOptions {
  resolver: ResolverOptions
  parent: any
  params: any
  viewer: any
  info: any
}

export type PermissionChecker = (options: PermissionCheckerOptions) => Promise<string | void>

export type ResolverMiddleware = (
  executeOptions: ExecuteOptions,
  next: () => Promise<any>,
) => Promise<any>
