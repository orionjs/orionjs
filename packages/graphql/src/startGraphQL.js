import {route} from '@orion-js/app'
import {ApolloServer} from 'apollo-server-micro'
import startGraphiQL from './startGraphiQL'
import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'
import micro from 'micro'
import {runHttpQuery} from 'apollo-server-core'

global.globalMicro = micro

export default async function (options) {
  const apolloOptions = await getApolloOptions(options)
  startGraphiQL(apolloOptions, options)

  if (options.subscriptions) {
    startWebsocket(apolloOptions, options)
  }

  const apolloServer = new ApolloServer(apolloOptions)
  const handler = apolloServer.createHandler() // highlight-line

  route('/graphql', async function (params) {
    const {request, response, viewer, getBodyJSON} = params

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
          return result
        }
      } catch (error) {
        console.log('Error executing GraphQL cache:', error)
      }
    }
    request._orionjsViewer = viewer
    handler(request, response)
  })
}
