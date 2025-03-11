import {PubSub} from 'graphql-subscriptions'
import {setPubsub} from './pubsub'
import {StartGraphQLOptions} from './types/startGraphQL'
import {ApolloServerOptions} from '@apollo/server'
import {WebSocketServer} from 'ws'
import {useServer} from 'graphql-ws/lib/use/ws'
import {getWebsockerViewer} from './websockerViewer'
import {getServer} from '@orion-js/http'

export default function (
  apolloOptions: ApolloServerOptions<any>,
  options: StartGraphQLOptions,
  /**
   * For testing purposes
   */
  wsServer?: any,
) {
  if (!options.subscriptions) {
    return []
  }

  const pubsub = options.pubsub || new PubSub()
  setPubsub(pubsub)

  // Creating the WebSocket server
  if (!wsServer) {
    wsServer = new WebSocketServer({
      server: getServer(),
      path: '/subscriptions',
    })
  }

  // Hand in the schema we just created and have the
  // WebSocketServer start listening.
  const serverCleanup = useServer(
    {
      schema: apolloOptions.schema,
      context: async (ctx, msg, args) => {
        // This will be run every time the client sends a subscription request
        return getWebsockerViewer(ctx.connectionParams)
      },
    },
    wsServer,
  )
  return [
    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose()
          },
        }
      },
    },
  ]
}
