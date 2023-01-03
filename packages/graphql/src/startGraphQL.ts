import startGraphiQL from './startGraphiQL'
import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'
import {getApp, getServer, getViewer, onError, registerRoute, Request, route} from '@orion-js/http'
import {StartGraphQLOptions} from './types/startGraphQL'
import {ApolloServer} from '@apollo/server'
import {expressMiddleware} from '@apollo/server/express4'
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer'
import {bodyParser} from '@orion-js/http'

export default async function (options: StartGraphQLOptions) {
  const apolloOptions = await getApolloOptions(options)

  const app = options.app || getApp()
  const httpServer = getServer()

  if (options.useGraphiql) {
    startGraphiQL(apolloOptions, options)
  }

  const subPlugins = startWebsocket(apolloOptions, options)

  const drainPlugins = httpServer ? [ApolloServerPluginDrainHttpServer({httpServer})] : []

  const server = new ApolloServer({
    ...apolloOptions,
    plugins: [...(apolloOptions.plugins || []), ...drainPlugins, ...subPlugins]
  })

  await server.start()

  app.use(
    '/graphql',
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({req, res}) => {
        try {
          const viewer = await getViewer(req)
          return viewer
        } catch (error) {
          console.log(error, JSON.stringify(error))
          await onError(req, res, error)
          return {}
        }
      }
    })
  )
}
