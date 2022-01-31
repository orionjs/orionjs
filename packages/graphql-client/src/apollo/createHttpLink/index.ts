import {BatchHttpLink} from '@apollo/client/link/batch-http'
import {HttpLink} from '@apollo/client/link/http'
import fetch from 'isomorphic-unfetch'
import getAuthHeaders from '../../auth/getAuthHeaders'
import {RetryLink} from '@apollo/client/link/retry'
import {ApolloLink} from '@apollo/client'
import onNetworkError from '../onNetworkError'
import getUri from './getUri'

export default ({endpointURL, batchInterval, canRetry, batch, getHeaders}) => {
  const customFetch = async (uri, options) => {
    const authHeaders = getAuthHeaders(options.body, getHeaders)
    for (const key of Object.keys(authHeaders)) {
      options.headers[key] = authHeaders[key]
    }
    try {
      const finalUri = getUri(uri, options)
      const result = await fetch(finalUri, options)
      return result
    } catch (error) {
      console.warn('GraphQL request error:', error)
      throw error
    }
  }

  const retryLink = new RetryLink({
    attempts(count, operation, error) {
      if (!canRetry) return false
      if (typeof canRetry === 'function') return canRetry(count, operation, error)

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
      return !!error
    },
    delay(count, operation, error) {
      return count * 500 * Math.random()
    }
  })

  const httpLink = batch
    ? new BatchHttpLink({
        uri: endpointURL + '/graphql',
        fetch: customFetch,
        batchInterval
      })
    : new HttpLink({
        uri: endpointURL + '/graphql',
        fetch: customFetch
      })

  return ApolloLink.from([retryLink, httpLink])
}
