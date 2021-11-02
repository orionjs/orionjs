export type SubscriptionPublish = (params: object, data: object) => Promise<void>

export interface SubscriptionData {
  key: string
  params: object
  subscribe: (callParams: object, viewer: object) => {}
  returns: any
}

export type Subscription = SubscriptionPublish & SubscriptionData

export interface SubscriptionMap {
  [key: string]: Subscription
}
