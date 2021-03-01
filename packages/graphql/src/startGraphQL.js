import {route, config} from '@orion-js/app'
import {ApolloServer} from 'apollo-server-micro'
import startGraphiQL from './startGraphiQL'
import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'
import micro from 'micro'
import defaultErrorHanlder from './defaultErrorHanlder'

global.globalMicro = micro

export default async function (options) {
  config({graphql: {errorHandler: options.errorHandler || defaultErrorHanlder}})
  const apolloOptions = await getApolloOptions(options)
  startGraphiQL(apolloOptions, options)

  if (options.subscriptions) {
    startWebsocket(apolloOptions, options)
  }

  const apolloServer = new ApolloServer(apolloOptions)
  const handler = apolloServer.createHandler() // highlight-line

  route('/graphql', async function ({request, response, viewer}) {
    request._orionjsViewer = viewer
    handler(request, response)
  })
}
