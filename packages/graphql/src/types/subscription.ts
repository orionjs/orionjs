import {ResolverOptions} from '@orion-js/resolvers'

export interface Subscription<ReturnType = any> {
  key: string
  params: object
  subscribe: (callParams: object, viewer: object) => {}
  returns: ReturnType
  publish: (params: object, data: ReturnType) => Promise<void>
}

export interface SubscriptionMap {
  [key: string]: Subscription
}

export interface SubscriptionOptions extends Omit<ResolverOptions, 'resolve'> {}
