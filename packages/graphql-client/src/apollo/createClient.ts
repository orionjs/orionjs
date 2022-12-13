import {ApolloClient} from '@apollo/client'
import defaultCache from './defaultCache'
import createLink from './createLink'
import {setOptions} from '../options'
import refreshJWT from './refreshJWT'
import {OrionApolloClientOpts, OrionApolloClient} from '../types'
import isSsrMode from './isSsrMode'

const defaultOptions: OrionApolloClientOpts = {
  endpointURL: 'http://localhost:3000',
  subscriptionsPath: '/subscriptions',
  useSubscriptions: true,
  saveSession: () => {
    throw new Error('You must pass a function to save the session')
  },
  getSession: () => {
    throw new Error('You must pass a function to get the saved session')
  },
  cache: defaultCache,
  batchInterval: 20,
  batch: true,
  canRetry: true,
  promptTwoFactorCode: () => prompt('Please write your two factor code to continue'),
  onError: () => {},
  getHeaders: () => {},
  resolvers: null,
  wsOptions: {},
  getJWT: () => null,
  upgradeJWT: () => {},
  refreshJWT: null,
  refreshJWTEvery: 5 * 60 * 1000,
  apolloOverrides: {}
}

export default function createClient(passedOptions: OrionApolloClientOpts): OrionApolloClient<any> {
  const options = {...defaultOptions, ...passedOptions}
  setOptions(options)

  const link = createLink(options)

  if (options.refreshJWT) {
    // initial upgrade
    if (options.upgradeJWT) {
      setTimeout(() => {
        const oldSession = options.getSession() || {}
        if (!options.getJWT() && oldSession.userId) {
          console.log('Performing initial JWT upgrade...')
          refreshJWT(options)
        }
      }, 1000)
    }
    setInterval(() => refreshJWT(options), options.refreshJWTEvery) // every 5 minutes
  }

  const client: OrionApolloClient<any> = new ApolloClient({
    ssrMode: isSsrMode(options),
    link,
    cache: options.cache,
    resolvers: options.resolvers,
    ...options.apolloOverrides
  })

  options.apolloClient = client
  client._orionOptions = options
  client._wsClient = options.wsClient
  setOptions(options)
  return client
}
