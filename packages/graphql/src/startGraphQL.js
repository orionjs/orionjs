import {ApolloServer} from 'apollo-server-micro'
import {route} from '@orion-js/app'
import startGraphiQL from './startGraphiQL'
import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'
import micro from 'micro'
import {runHttpQuery} from 'apollo-server-core'
import {InMemoryLRUCache} from 'apollo-server-caching'
import getOperationName from './getOperationName'
import storePersistedQuery from './storePersistedQuery'

global.globalMicro = micro

export default async function (options) {
  const apolloOptions = await getApolloOptions(options)
  startGraphiQL(apolloOptions, options)

  if (options.subscriptions) {
    startWebsocket(apolloOptions, options)
  }

  const apolloServer = new ApolloServer(apolloOptions)
  await apolloServer.start()
  const handler = apolloServer.createHandler() // highlight-line
  const cacheControlCache = apolloOptions.persistedQueries?.cache
    ? apolloOptions.persistedQueries.cache
    : new InMemoryLRUCache()

  route('/graphql', async function (params) {
    const {request, response, viewer, getBodyJSON} = params
    const operationName = await getOperationName(params)
    const cacheKey = operationName ? `orion-cache-control-${operationName}` : null

    if (options.executeGraphQLCache) {
      try {
        // this returns the original not-cached answer
        const fallback = async () => {
          const data = await getBodyJSON()

          const gqlResponse = await runHttpQuery([request, response], {
            method: request.method,
            options: {...apolloOptions, context: viewer},
            query: data
          })

          return gqlResponse.graphqlResponse
        }

        const result = await options.executeGraphQLCache(params, fallback)
        if (result) {
          await storePersistedQuery(apolloOptions, params)

          if (result.cacheControl && cacheKey) {
            cacheControlCache.set(cacheKey, result.cacheControl)
            response.setHeader('Cache-Control', result.cacheControl)
          }
          return result
        }
      } catch (error) {
        console.log('Error executing GraphQL cache:', error)
      }
    }

    if (cacheKey) {
      let shouldCache = true
      if (apolloOptions?.shouldAddCacheControl) {
        shouldCache = apolloOptions.shouldAddCacheControl(operationName)
      }
      if (shouldCache) {
        const cacheControl = await cacheControlCache.get(cacheKey)
        if (cacheControl) {
          response.setHeader('Cache-Control', cacheControl)
        }
      }
    }

    request._orionjsViewer = viewer
    handler(request, response)
  })
}
