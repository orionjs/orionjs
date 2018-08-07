import {BatchHttpLink} from 'apollo-link-batch-http'
import fetch from 'unfetch'
import getAuthHeaders from '../auth/getAuthHeaders'

const customFetch = (uri, options) => {
  const authHeaders = getAuthHeaders(options.body)
  for (const key of Object.keys(authHeaders)) {
    options.headers[key] = authHeaders[key]
  }
  return fetch(uri, options)
}

export default ({endpointURL, batchInterval}) =>
  new BatchHttpLink({
    uri: endpointURL + '/graphql',
    fetch: customFetch,
    batchInterval
  })
