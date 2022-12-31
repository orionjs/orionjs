import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'
import {resolver, addPermissionChecker} from '@orion-js/resolvers'
import {subscription} from '.'
import {ApolloClient, InMemoryCache} from '@apollo/client/core'
import gql from 'graphql-tag'
import {sleep} from '@orion-js/helpers'
import {random} from 'lodash'
import {setGetWebsockerViewer} from './websockerViewer'
import {TypedModel, Prop, getModelForClass, TypedSchema} from '@orion-js/typed-model'
import {GraphQLWsLink} from '@apollo/client/link/subscriptions'
import {createClient} from 'graphql-ws'
import ws, {WebSocketServer} from 'ws'
import crypto from 'crypto'
import {express, getServer} from '@orion-js/http'
import WebSocket from 'ws'
import http from 'http'
import request from 'superwstest'

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

  const withGlobalPermissionsSub = subscription({
    returns: 'string',
    permissionsOptions: {
      role: 'user'
    }
  })

  const withoutGlobalPermissionsSub = subscription({
    returns: 'string',
    permissionsOptions: {
      role: 'admin'
    }
  })

  @TypedSchema()
  class TestParams {
    @Prop({type: 'ID'})
    userId: string
  }

  @TypedSchema()
  class TestModel {
    @Prop()
    name: string

    @Prop()
    age: number
  }

  const modelSub = subscription<TestParams, TestModel>({
    params: getModelForClass(TestParams),
    returns: getModelForClass(TestModel)
  })

  const subscriptions = {
    onNewGreeting,
    withPermissionsSub,
    withoutPermissionsSub,
    withGlobalPermissionsSub,
    withoutGlobalPermissionsSub,
    modelSub
  }

  const apolloOptions = await getApolloOptions({
    resolvers,
    subscriptions
  })

  return {apolloOptions, resolvers, subscriptions}
}

const gqClient = async () => {
  // To make the point clear that we are not opening any ports here we use a randomized string that will not produce a correct port number.
  // This example of WebSocket client/server uses string matching to know to what server connect a given client.
  // We are randomizing because we should use different string for every test to not share state.
  const RANDOM_WS_PORT = random(10000, 65536)

  // We pass customServer instead of typical configuration of a default WebSocket server
  const {apolloOptions, subscriptions} = await getStartServerOptions()

  const uri = `ws://localhost:${RANDOM_WS_PORT}/subscriptions`
  const server = new WebSocketServer({
    server: getServer(),
    path: '/subscriptions',
    port: RANDOM_WS_PORT
  })
  startWebsocket({schema: apolloOptions.schema}, {resolvers: {}, subscriptions: {}}, server)

  const getConnectionParams = () => {
    return {jwt: 'hi'}
  }

  const client = createClient({
    url: uri,
    webSocketImpl: ws,
    connectionParams: getConnectionParams,
    lazy: false,
    /**
     * Generates a v4 UUID to be used as the ID.
     * Reference: https://gist.github.com/jed/982883
     */
    generateID: () =>
      // @ts-expect-error this is the way to do it segun la doc
      ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ (crypto.randomBytes(1)[0] & (15 >> (c / 4)))).toString(16)
      )
  })

  // The uri of the WebSocketLink has to match the customServer uri.
  const wsLink = new GraphQLWsLink(client)

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

    await sleep(50)

    expect.assertions(2)

    await subscriptions.onNewGreeting.publish({name: 'Nico'}, 'finally')
    await subscriptions.onNewGreeting.publish({name: 'Nico'}, 'finally')

    await sleep(50)
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

    await sleep(50)

    expect.assertions(1) // only with should be called

    await subscriptions.withPermissionsSub.publish({}, 'yes')
    await subscriptions.withoutPermissionsSub.publish({}, 'no')

    await sleep(50)
  })

  it('Should execute subscriptions with global permissions correctly using custom get viewer and custom global permission checker', async () => {
    const {client, subscriptions} = await gqClient()

    setGetWebsockerViewer((connectionParams: any) => {
      return {
        role: 'user'
      }
    })

    addPermissionChecker(async ({resolver, viewer}) => {
      if (!resolver.permissionsOptions) return null
      if (resolver.permissionsOptions.role === viewer.role) return null
      return 'notAllowed'
    })

    client
      .subscribe({
        query: gql`
          subscription {
            info: withGlobalPermissionsSub
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
            info: withoutGlobalPermissionsSub
          }
        `
      })
      .subscribe({
        next({data}) {
          expect(data.info).toEqual('no')
        }
      })

    await sleep(50)

    expect.assertions(1) // only with should be called

    await subscriptions.withGlobalPermissionsSub.publish({}, 'yes')
    await subscriptions.withoutGlobalPermissionsSub.publish({}, 'no')

    await sleep(50)
  })

  it('Should work with typed model subscriptions', async () => {
    const {client, subscriptions} = await gqClient()

    client
      .subscribe({
        query: gql`
          subscription ($userId: ID) {
            info: modelSub(userId: $userId) {
              name
            }
          }
        `,
        variables: {userId: '1'}
      })
      .subscribe({
        next({data}) {
          expect(data.info).toEqual({name: 'Nico', __typename: 'TestModel'})
        }
      })

    await sleep(50)

    expect.assertions(2)

    await subscriptions.modelSub.publish({userId: '1'}, {name: 'Nico', age: 20})
    await subscriptions.modelSub.publish({userId: '1'}, {name: 'Nico', age: 20})

    await sleep(50)
  })
})
