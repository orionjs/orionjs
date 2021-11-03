import {execute, subscribe} from 'graphql'
import {SubscriptionServer} from 'subscriptions-transport-ws'
import {PubSub} from 'graphql-subscriptions'
import {setPubsub} from './pubsub'
import {getApp} from '@orion-js/http'
import {getViewer} from './websockerViewer'

export default function ({schema}, options) {
  setPubsub(options.pubsub || new PubSub())

  const server = options.server || getApp()
  if (!server) {
    throw new Error(
      'Error starting GraphQL WebSocket. You must start http server before starting GraphQL WebSocket'
    )
  }

  SubscriptionServer.create(
    {
      execute,
      subscribe,
      schema,
      async onConnect(connectionParams) {
        try {
          const viewer = await getViewer(connectionParams)
          return viewer
        } catch (error) {
          console.log('Error connecting to GraphQL Subscription server', error)
          const viewer = await getViewer({})
          return viewer
        }
      },
      onDisconnect() {}
    },
    server
  )
}
