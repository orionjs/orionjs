import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'
import {resolver} from '@orion-js/resolvers'
import {subscription} from '.'
import {Server, WebSocket} from 'mock-socket-with-protocol'
import {ApolloClient, InMemoryCache} from '@apollo/client/core'
import {WebSocketLink} from '@apollo/client/link/ws'
import gql from 'graphql-tag'
import {sleep} from '@orion-js/helpers'
import {lowerFirst, random} from 'lodash'

const getStartServerOptions = async () => {
  const resolvers = {
    helloWorld: resolver({
      params: {
        name: {
          type: 'string'
        }
      },
      returns: 'string',
      async resolve({name}) {
        return `Hello ${name}`
      }
    })
  }

  const onNewGreeting = subscription<{name: string}, string>({
    params: {
      name: {
        type: 'string'
      }
    },
    returns: 'string'
  })

  const withPermissionsSub = subscription({
    returns: 'string',
    checkPermission: async () => null
  })

  const withoutPermissionsSub = subscription({
    returns: 'string',
    checkPermission: async () => 'notAllowed'
  })

  const subscriptions = {
    onNewGreeting,
    withPermissionsSub,
    withoutPermissionsSub
  }

  const apolloOptions = await getApolloOptions({
    resolvers,
    subscriptions
  })

  return {apolloOptions, subscriptions}
}

const gqClient = async () => {
  // To make the point clear that we are not opening any ports here we use a randomized string that will not produce a correct port number.
  // This example of WebSocket client/server uses string matching to know to what server connect a given client.
  // We are randomizing because we should use different string for every test to not share state.
  const RANDOM_WS_PORT = random(10000, 65536)

  // We pass customServer instead of typical configuration of a default WebSocket server
  const {apolloOptions, subscriptions} = await getStartServerOptions()

  const uri = `ws://localhost:${RANDOM_WS_PORT}`
  const server = new Server(uri)
  startWebsocket({schema: apolloOptions.schema}, {server})

  const getConnectionParams = () => {
    return {jwt: 'hi'}
  }

  // The uri of the WebSocketLink has to match the customServer uri.
  const wsLink = new WebSocketLink({
    uri,
    webSocketImpl: WebSocket,
    options: {
      connectionParams: getConnectionParams,
      connectionCallback: error => {
        if (error) throw error
      },
      lazy: false
    }
  })

  // Nothing new here
  return {
    client: new ApolloClient({
      link: wsLink,
      cache: new InMemoryCache()
    }),
    subscriptions
  }
}

describe('Test GraphQL Subscriptions', () => {
  it('Should connect to the graphql subscription server correctly', async () => {
    const {client, subscriptions} = await gqClient()

    client
      .subscribe({
        query: gql`
          subscription ($name: String) {
            info: onNewGreeting(name: $name)
          }
        `,
        variables: {name: 'Nico'}
      })
      .subscribe({
        next({data}) {
          expect(data.info).toEqual('finally')
        }
      })

    await sleep(100)

    expect.assertions(2)

    await subscriptions.onNewGreeting.publish({name: 'Nico'}, 'finally')
    await subscriptions.onNewGreeting.publish({name: 'Nico'}, 'finally')

    await sleep(100)
  })

  it('Should execute subscriptions permissions correctly', async () => {
    const {client, subscriptions} = await gqClient()

    client
      .subscribe({
        query: gql`
          subscription {
            info: withPermissionsSub
          }
        `
      })
      .subscribe({
        next({data}) {
          expect(data.info).toEqual('yes')
        }
      })

    client
      .subscribe({
        query: gql`
          subscription {
            info: withoutPermissionsSub
          }
        `
      })
      .subscribe({
        next({data}) {
          expect(data.info).toEqual('no')
        }
      })

    await sleep(100)

    expect.assertions(1) // only with should be called

    await subscriptions.withPermissionsSub.publish({}, 'yes')
    await subscriptions.withoutPermissionsSub.publish({}, 'no')

    await sleep(100)
  })
})
