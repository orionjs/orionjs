import {getServer, getViewer} from '@orion-js/app'
import {execute, subscribe} from 'graphql'
import {SubscriptionServer} from 'subscriptions-transport-ws'
import {PubSub} from 'graphql-subscriptions'
import {setPubsub} from './pubsub'

export default function({schema}, options) {
  setPubsub(options.pubsub || new PubSub())

  const server = getServer()
  const path = '/subscriptions'
  const subServer = new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
      async onConnect(connectionParams, webSocket) {
        try {
          const params = {
            headers: {
              'x-orion-nonce': connectionParams.nonce,
              'x-orion-publickey': connectionParams.publicKey,
              'x-orion-signature': connectionParams.signature
            },
            getBody: () => 'websockethandshake'
          }
          const viewer = await getViewer(params)
          return viewer
        } catch (error) {
          const viewer = await getViewer()
          return viewer
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
