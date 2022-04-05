import {InMemoryCache} from '@apollo/client/cache'
import {Resolvers, ApolloClient} from '@apollo/client'
import {ClientOptions, SubscriptionClient} from 'subscriptions-transport-ws'
import {RetryFunction} from '@apollo/client/link/retry/retryFunction'

export interface OrionApolloClientOpts {
  endpointURL?: string
  subscriptionsPath?: string
  useSubscriptions?: boolean
  saveSession?: Function
  getSession?: Function
  cache?: InMemoryCache | any
  batchInterval?: number
  batch?: boolean
  canRetry?: boolean | RetryFunction
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
  customFetch?: typeof fetch
}

export interface OrionApolloClient<T> extends ApolloClient<T> {
  _orionOptions?: OrionApolloClientOpts
  _wsClient?: SubscriptionClient
}
