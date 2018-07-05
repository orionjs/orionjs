import {getServer, GraphQL} from '@orion-js/app'
import {SubscriptionServer} from 'subscriptions-transport-ws'

const {execute, subscribe} = GraphQL

export default function() {
  const server = getServer()

  return ({schema}) => {
    const subscriptionServer = SubscriptionServer.create(
      {
        schema,
        execute,
        subscribe
      },
      {
        server: server,
        path: '/graphql'
      }
    )
  }
}
