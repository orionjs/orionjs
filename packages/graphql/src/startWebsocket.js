import {getServer, getViewer} from '@orion-js/app'
import {execute, subscribe} from 'graphql'
import {SubscriptionServer} from 'subscriptions-transport-ws'
import {PubSub} from 'graphql-subscriptions'
import {setPubsub} from './pubsub'

export default function({schema}, options) {
  setPubsub(options.pubsub || new PubSub())

  let currentConnections = null

  if (options.pm2io) {
    currentConnections = options.pm2io.counter({
      name: 'Connections to WebSocket',
      type: 'counter'
    })
  }

  const server = getServer()
  const path = '/subscriptions'
  const subServer = new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
      async onConnect(connectionParams, webSocket) {
        if (currentConnections) {
          currentConnections.inc()
        }
        try {
          const params = {
            headers: {
              'x-orion-nonce': connectionParams.nonce,
              'x-orion-publickey': connectionParams.publicKey,
              'x-orion-signature': connectionParams.signature
            },
            getBody: () => 'websockethandshake',
            nonceName: 'graphqlsubs'
          }
          const viewer = await getViewer(params)
          return viewer
        } catch (error) {}
        const viewer = await getViewer()
        return viewer
      },
      onDisconnect() {
        if (currentConnections) {
          currentConnections.dec()
        }
      }
    },
    {
      server,
      path
    }
  )

  return subServer
}
