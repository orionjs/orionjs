import {OrionCache} from '@orion-js/cache'

export type GlobalResolve = (params: any, viewer: any) => Promise<any>
export type ModelResolve = (parent: any, params: any, viewer: any) => Promise<any>

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

export type Execute = (executeOptions: ExecuteParams) => Promise<any>

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

export interface Resolver extends SharedResolverOptions {
  execute: Execute
}
