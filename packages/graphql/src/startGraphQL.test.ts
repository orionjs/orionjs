import {startGraphQL} from '.'
import {resolver} from '@orion-js/resolvers'
import {getApp} from '@orion-js/http'
import request from 'supertest'

describe('Test GraphQL Server', () => {
  it('should startGraphQL with only resolvers', async () => {
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
    await startGraphQL({
      resolvers
    })
  })

  it('should startGraphQL and make a request', async () => {
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
    await startGraphQL({
      resolvers
    })

    const app = getApp()

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        variables: {
          name: 'Nico'
        },
        query: `query testOperation($name: String) {
        helloWorld(name: $name)
      }`
      })

    expect(response.body.data).toEqual({helloWorld: 'Hello Nico'})
  })

  it('should return errors correctly', async () => {
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
    await startGraphQL({
      resolvers
    })

    const app = getApp()

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        variables: {
          name: 'Nico'
        },
        query: `query testOperation($name: String) {
        helloWorld_doesntExists(name: $name)
      }`
      })

    expect(response.statusCode).toBe(400)
    expect(response.body.errors[0].message).toEqual(
      'Cannot query field "helloWorld_doesntExists" on type "Query".'
    )
  })
})
