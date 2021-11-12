import {OrionCache} from '@orion-js/cache'

export type GlobalResolverResolve<ParamsType = any, ReturnType = any> = (
  params?: ParamsType,
  viewer?: any
) => Promise<ReturnType>

export type ModelResolverResolve<ModelType = any, ParamsType = any, ReturnType = any> = (
  item: ModelType,
  params?: ParamsType,
  viewer?: any
) => Promise<ReturnType>

export type GlobalCheckPermissions = (params: any, viewer: any) => Promise<string>
export type ModelCheckPermissions = (parent: any, params: any, viewer: any) => Promise<string>

export type GlobalGetCacheKey = (params: any, viewer: any) => Promise<any>
export type ModelGetCacheKey = (parent: any, params: any, viewer: any) => Promise<any>

export interface ExecuteOptions {
  params: object
  viewer: any
  parent?: any
}

export interface ExecuteParams<ParamsType = object, ModelType = undefined> {
  params?: ParamsType
  viewer?: any
  parent?: ModelType
}

export type Execute<ParamsType = object, ReturnType = any, ModelType = undefined> = (
  executeOptions: ExecuteParams<ParamsType, ModelType>
) => Promise<ReturnType>

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
}

export interface ResolverOptions<ParamsType = object, ReturnType = any, ModelType = undefined>
  extends SharedResolverOptions {
  resolve: ModelType extends undefined
    ? GlobalResolverResolve<ParamsType, ReturnType>
    : ModelResolverResolve<ModelType, ParamsType, ReturnType>
}

export interface Resolver<ParamsType = any, ReturnType = any, ModelType = undefined>
  extends SharedResolverOptions {
  execute: Execute<ParamsType, ReturnType, ModelType>
  resolve: ModelType extends undefined
    ? GlobalResolverResolve<ParamsType, ReturnType>
    : ModelResolverResolve<ModelType, ParamsType, ReturnType>
  modelResolve?: ModelType extends undefined
    ? undefined
    : GlobalResolverResolve<ParamsType, ReturnType>
}

export type CreateResolver = <ParamsType, ReturnType>(
  options: {
    resolve: (params?: ParamsType, viewer?: any) => Promise<ReturnType>
  } & ResolverOptions<ParamsType, ReturnType>
) => Resolver<ParamsType, ReturnType, undefined>

export type CreateModelResolver = <ModelType, ParamsType, ReturnType>(
  options: {
    resolve: (item: ModelType, params?: ParamsType, viewer?: any) => Promise<ReturnType>
  } & ResolverOptions<ParamsType, ReturnType, ModelType>
) => Resolver<ParamsType, ReturnType, ModelType>

export interface PermissionCheckerOptions {
  resolver: ResolverOptions
  parent: any
  params: any
  viewer: any
}

export type PermissionChecker = (options: PermissionCheckerOptions) => Promise<string | void>
