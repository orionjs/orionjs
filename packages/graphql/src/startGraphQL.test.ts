import {startGraphQL} from '.'
import {resolver} from '@orion-js/resolvers'
import {express} from '@orion-js/http'
import request from 'supertest'
import {TypedSchema, Prop} from '@orion-js/typed-model'
import {cleanResolvers} from './cleanResolvers'
import {createModel} from '@orion-js/models'

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
    @TypedSchema()
    class Params {
      @Prop()
      userId: string
    }

    @TypedSchema()
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
      params: Params,
      returns: User,
      resolve
    })

    const model = createModel({
      name: 'Model',
      schema: {
        user: {type: User}
      }
    })

    const modelMutation = resolver({
      params: Params,
      returns: [model],
      mutation: true,
      resolve
    })

    const resolvers = {user, modelMutation}
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
