import {BatchHttpLink} from 'apollo-link-batch-http'
import {HttpLink} from 'apollo-link-http'
import fetch from 'unfetch'
import getAuthHeaders from '../auth/getAuthHeaders'
import {RetryLink} from 'apollo-link-retry'
import {ApolloLink} from 'apollo-link'

export default ({endpointURL, batchInterval, canRetry, batch, getHeaders}) => {
  const customFetch = async (uri, options) => {
    const authHeaders = getAuthHeaders(options.body, getHeaders)
    for (const key of Object.keys(authHeaders)) {
      options.headers[key] = authHeaders[key]
    }
    try {
      const result = await fetch(uri, options)
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
        if (error.result.message === 'nonceIsInvalid') {
          return count < 30
        }
      }
      if (count > 10) return false
      return !!error
    },
    delay(count, operation, error) {
      return count * 100 * Math.random()
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
