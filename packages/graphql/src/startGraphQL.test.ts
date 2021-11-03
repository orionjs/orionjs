import {startGraphQL} from '.'
import {resolver} from '@orion-js/resolvers'
import {express} from '@orion-js/http'
import request from 'supertest'
import {TypedModel, Prop, getModelForClass} from '@orion-js/typed-model'
import {cleanResolvers} from './cleanResolvers'

describe('Test GraphQL Server', () => {
  beforeEach(() => {
    cleanResolvers()
  })

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

    const app = express()
    await startGraphQL({
      resolvers,
      app
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

    const app = express()
    await startGraphQL({
      resolvers,
      app
    })

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

    const app = express()
    await startGraphQL({
      resolvers,
      app
    })

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

  it('Should make requests to schemas with typed models', async () => {
    @TypedModel()
    class Params {
      @Prop()
      userId: string
    }

    @TypedModel()
    class User {
      @Prop()
      name: string

      @Prop()
      age: number
    }

    const resolve = async ({userId}) => {
      if (userId !== '1') return null
      return {
        name: 'Nico',
        age: 20
      }
    }

    const user = resolver({
      params: getModelForClass(Params),
      returns: getModelForClass(User),
      resolve
    })

    const resolvers = {user}
    const app = express()
    await startGraphQL({
      resolvers,
      app
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        variables: {
          userId: '1'
        },
        query: `query ($userId: String) {
        user(userId: $userId) {
          name
          age
        }
      }`
      })

    expect(response.statusCode).toBe(200)
    expect(response.body.data).toEqual({
      user: {
        name: 'Nico',
        age: 20
      }
    })
  })
})
