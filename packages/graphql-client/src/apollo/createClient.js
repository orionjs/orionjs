import {ApolloClient} from 'apollo-client'
import defaultCache from './defaultCache'
import createLink from './createLink'
import {setOptions} from '../options'
import refreshJWT from './refreshJWT'

const defaultOptions = {
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
  promptTwoFactorCode: () => global.prompt('Please write your two factor code to continue'),
  onError: () => {},
  getHeaders: () => {},
  resolvers: null,
  wsOptions: {},
  getJWT: () => {},
  upgradeJWT: () => {},
  refreshJWT: () => {}
}

export default function (passedOptions) {
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
    setInterval(() => refreshJWT(options), 5 * 60 * 1000) // every 5 minutes
  }

  const client = new ApolloClient({link, cache: options.cache, resolvers: options.resolvers})

  global.apolloClient = client

  options.apolloClient = client
  client._orionOptions = options
  client._wsClient = options.wsClient
  setOptions(options)
  return client
}
