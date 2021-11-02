import {execute, subscribe} from 'graphql'
import {SubscriptionServer} from 'subscriptions-transport-ws'
import {PubSub} from 'graphql-subscriptions'
import {setPubsub} from './pubsub'
import {getApp} from '@orion-js/http'
import {getViewer} from './websockerViewer'

export default function ({schema}, options) {
  setPubsub(options.pubsub || new PubSub())

  const server = getApp()
  if (!server) {
    throw new Error(
      'Error starting GraphQL WebSocket. You must start http server before starting GraphQL WebSocket'
    )
  }

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
              'x-orion-jwt': connectionParams.jwt
            }
          }
          const viewer = await getViewer(params)
          return viewer
        } catch (error) {
          const viewer = await getViewer({})
          return viewer
        }
      },
      onDisconnect() {}
    },
    {
      server,
      path
    }
  )

  return subServer
}
