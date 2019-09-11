import {route} from '@orion-js/app'
import {runHttpQuery} from 'apollo-server-core'
import startGraphiQL from './startGraphiQL'
import getQuery from './getQuery'
import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'

export default async function(options) {
  const apolloOptions = await getApolloOptions(options)
  startGraphiQL(apolloOptions, options)

  if (options.subscriptions) {
    startWebsocket(apolloOptions, options)
  }

  let currentQueries = null
  let reqSec = null
  let latency = null

  if (options.pm2io) {
    currentQueries = options.pm2io.counter({
      name: 'GraphQL active queries',
      type: 'counter'
    })
    reqSec = options.pm2io.meter({
      name: 'GraphQL req/sec',
      type: 'meter'
    })

    latency = options.pm2io.histogram({
      name: 'GraphQL latency',
      measurement: 'mean'
    })
  }

  route('/graphql', async function({request, response, viewer}) {
    let time = new Date()
    if (options.pm2io) {
      currentQueries.inc()
      reqSec.mark()
    }

    const query = await getQuery(request)

    apolloOptions.context = viewer

    const gqlResponse = await runHttpQuery([request, response], {
      method: request.method,
      options: apolloOptions,
      query
    })

    const duration = new Date() - time

    if (options.pm2io) {
      latency.update(duration)
      currentQueries.dec()
    }

    return gqlResponse.graphqlResponse
  })
}
