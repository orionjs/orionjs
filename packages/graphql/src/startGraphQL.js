import {route} from '@orion-js/app'
import {runHttpQuery} from 'apollo-server-core'
import startGraphiQL from './startGraphiQL'
import getQuery from './getQuery'
import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'

export default async function (options) {
  const apolloOptions = await getApolloOptions(options)
  startGraphiQL(apolloOptions, options)

  if (options.subscriptions) {
    startWebsocket(apolloOptions, options)
  }

  route('/graphql', async function ({request, response, viewer}) {
    const query = await getQuery(request)

    apolloOptions.context = viewer

    const gqlResponse = await runHttpQuery([request, response], {
      method: request.method,
      options: apolloOptions,
      query
    })

    return gqlResponse.graphqlResponse
  })
}
