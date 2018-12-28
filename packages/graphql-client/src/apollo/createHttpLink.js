import {BatchHttpLink} from 'apollo-link-batch-http'
import {HttpLink} from 'apollo-link-http'
import fetch from 'unfetch'
import getAuthHeaders from '../auth/getAuthHeaders'
import {RetryLink} from 'apollo-link-retry'
import {ApolloLink} from 'apollo-link'

export default ({endpointURL, batchInterval, canRetry, batch, getHeaders}) => {
  const customFetch = (uri, options) => {
    const authHeaders = getAuthHeaders(options.body, getHeaders)
    for (const key of Object.keys(authHeaders)) {
      options.headers[key] = authHeaders[key]
    }
    return fetch(uri, options)
  }

  const retryLink = new RetryLink({
    attempts(count, operation, error) {
      if (!canRetry) return false
      if (typeof canRetry === 'function') return canRetry(count, operation, error)
      if (error && error.result && error.result.error === 'AuthError') {
        if (error.result.message === 'nonceIsInvalid') {
          return count < 10
        }
      }
      if (count > 4) return false
      return !!error
    },
    delay(count, operation, error) {
      return count * 1000 * Math.random()
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
