import {BatchHttpLink} from '@apollo/client/link/batch-http'
import {HttpLink} from '@apollo/client/link/http'
import fetch from 'isomorphic-unfetch'
import getAuthHeaders from '../../auth/getAuthHeaders'
import {RetryLink} from '@apollo/client/link/retry'
import {ApolloLink} from '@apollo/client'
import onNetworkError from '../onNetworkError'
import getUri from './getUri'
import {OrionApolloClientOpts} from '../../types'

export default (options: OrionApolloClientOpts) => {
  const customFetch = async (uri: string, fetchOptions: RequestInit) => {
    const authHeaders = getAuthHeaders(fetchOptions.body, options.getHeaders)
    for (const key of Object.keys(authHeaders)) {
      fetchOptions.headers[key] = authHeaders[key]
    }
    try {
      const finalUri = getUri(uri, fetchOptions)
      const fetchFunction = options.customFetch ? options.customFetch : fetch
      const result = await fetchFunction(finalUri, fetchOptions)
      return result
    } catch (error) {
      console.warn('GraphQL request error:', error)
      throw error
    }
  }

  const retryLink = new RetryLink({
    attempts(count, operation, error) {
      if (!options.canRetry) return false
      if (typeof options.canRetry === 'function') return options.canRetry(count, operation, error)

      if (error && error.result && error.result.error === 'AuthError') {
        if (error.result.message.toLowerCase().includes('jwt')) {
          return false
        } else if (error.result.message === 'nonceIsInvalid') {
          return count < 20
        } else {
          console.log('got an auth error and will retry')
          onNetworkError({networkError: error}) // session should be reseted
          return count < 5
        }
      }
      if (count > 10) return false

      console.log('Received a request with error. Will retry', error)

      return !!error
    },
    delay: {
      initial: 250,
      max: Infinity,
      jitter: true
    }
  })

  const httpLink = options.batch
    ? new BatchHttpLink({
        uri: options.endpointURL + '/graphql',
        fetch: customFetch,
        batchInterval: options.batchInterval
      })
    : new HttpLink({
        uri: options.endpointURL + '/graphql',
        fetch: customFetch
      })

  return ApolloLink.from([retryLink, httpLink])
}
