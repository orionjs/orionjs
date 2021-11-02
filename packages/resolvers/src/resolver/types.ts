import {OrionCache} from '@orion-js/cache'

export type GlobalResolve<T = Promise<any>> = (params: any, viewer: any) => T
export type ModelResolve<T = Promise<any>> = (parent: any, params: any, viewer?: any) => T

export type GlobalCheckPermissions = (params: any, viewer: any) => Promise<string>
export type ModelCheckPermissions = (parent: any, params: any, viewer: any) => Promise<string>

export type GlobalGetCacheKey = (params: any, viewer: any) => Promise<any>
export type ModelGetCacheKey = (parent: any, params: any, viewer: any) => Promise<any>

export interface Params {
  [key: string]: any
}

export interface ExecuteOptions {
  params: Params
  viewer: any
  parent?: any
}

export interface ExecuteParams {
  params?: Params
  viewer?: any
  parent?: any
}

export type Execute<ReturnType = any> = (executeOptions: ExecuteParams) => Promise<ReturnType>

export interface SharedResolverOptions {
  resolverId?: string
  params?: Params
  returns?: any
  mutation?: boolean
  private?: boolean
  checkPermission?: GlobalCheckPermissions | ModelCheckPermissions
  getCacheKey?: GlobalGetCacheKey | ModelGetCacheKey
  cache?: number
  cacheProvider?: OrionCache
  permissionsOptions?: any
}

export interface ResolverOptions extends SharedResolverOptions {
  resolve: GlobalResolve | ModelResolve

  /**
   * Any other option passed to the resolver
   */
  // [key: string]: any
}

type AnyFunction = (...args: any) => any

export interface Resolver<ResolveFunction extends AnyFunction> extends SharedResolverOptions {
  execute: Execute<ReturnType<ResolveFunction>>
  resolve: ResolveFunction
}

export type CreateResolver = <ResolveFunction extends AnyFunction>(
  options: ResolverOptions
) => Resolver<ResolveFunction>

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never
export type ModelResolverFunction<F extends ModelResolve> = OmitFirstArg<F>
