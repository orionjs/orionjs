import {InMemoryCache} from '@apollo/client/cache'
import {Resolvers, ApolloClient} from '@apollo/client'
import {ClientOptions, SubscriptionClient} from 'subscriptions-transport-ws'

export interface OrionApolloClientOpts {
  endpointURL?: string
  subscriptionsPath?: string
  useSubscriptions?: boolean
  saveSession?: Function
  getSession?: Function
  cache?: InMemoryCache | any
  batchInterval?: number
  batch?: boolean
  canRetry?: boolean
  promptTwoFactorCode?: Function
  onError?: Function
  getHeaders?: Function
  resolvers?: Resolvers | Resolvers[]
  wsOptions?: Partial<ClientOptions>
  getJWT?: Function
  upgradeJWT?: Function
  refreshJWT?: Function
  apolloClient?: ApolloClient<any>
  wsClient?: SubscriptionClient
  ssrMode?: boolean
}

export interface OrionApolloClient<T> extends ApolloClient<T> {
  _orionOptions?: OrionApolloClientOpts
  _wsClient?: SubscriptionClient
}
