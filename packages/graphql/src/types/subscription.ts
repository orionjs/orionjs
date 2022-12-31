import {ResolverOptions} from '@orion-js/resolvers'

export interface OrionSubscription<TParams = any, ReturnType = any> {
  key: string
  params: object
  subscribe: (callParams: object, viewer: object) => {}
  returns: ReturnType
  publish: (params: TParams, data: ReturnType) => Promise<void>
}

export type CreateOrionSubscriptionFunction = <T = any, ReturnType = any>(
  options: OrionSubscriptionOptions
) => OrionSubscription<T, ReturnType>

export interface OrionSubscriptionsMap {
  [key: string]: OrionSubscription
}

export interface OrionSubscriptionOptions extends Omit<ResolverOptions, 'resolve'> {}
