import {startGraphQL} from '.'
import {resolver} from '@orion-js/resolvers'
import {getApp} from '@orion-js/http'
import request from 'supertest'

describe('Test startGraphQL', () => {
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
})
