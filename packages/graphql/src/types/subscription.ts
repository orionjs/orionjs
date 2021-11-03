import {Params, ResolverOptions} from '@orion-js/resolvers'

export interface Subscription<T extends Params = any, ReturnType = any> {
  key: string
  params: object
  subscribe: (callParams: object, viewer: object) => {}
  returns: ReturnType
  publish: (params: T, data: ReturnType) => Promise<void>
}

export type CreateSubscriptionFunction = <T extends Params = any, ReturnType = any>(
  options: SubscriptionOptions
) => Subscription<T, ReturnType>

export interface SubscriptionMap {
  [key: string]: Subscription
}

export interface SubscriptionOptions extends Omit<ResolverOptions, 'resolve'> {}
