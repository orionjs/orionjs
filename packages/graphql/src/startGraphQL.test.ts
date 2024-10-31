import {startGraphQL} from '.'
import {resolver} from '@orion-js/resolvers'
import {express} from '@orion-js/http'
import request from 'supertest'
import {TypedSchema, Prop} from '@orion-js/typed-model'
import {cleanResolvers} from './cleanResolvers'
import {createModel} from '@orion-js/models'
import {UserError} from '@orion-js/helpers'
import {GraphQLResolveInfo} from 'graphql'

describe('Test GraphQL Server', () => {
  beforeEach(() => {
    cleanResolvers()
  })

  it('should startGraphQL with only resolvers', async () => {
    const resolvers = {
      helloWorld: resolver({
        params: {
          name: {
            type: 'string',
          },
        },
        returns: 'string',
        async resolve({name}) {
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })
  })

  it('should startGraphQL and make a request', async () => {
    const resolvers = {
      helloWorld: resolver({
        params: {
          name: {
            type: 'string',
          },
        },
        returns: 'string',
        async resolve({name}) {
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        variables: {
          name: 'Nico',
        },
        query: `query testOperation($name: String) {
        helloWorld(name: $name)
      }`,
      })

    expect(response.body.data).toEqual({helloWorld: 'Hello Nico'})
  })

  it('should return errors correctly', async () => {
    const resolvers = {
      helloWorld: resolver({
        params: {
          name: {
            type: 'string',
          },
        },
        returns: 'string',
        async resolve({name}) {
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        variables: {
          name: 'Nico',
        },
        query: `query testOperation($name: String) {
        helloWorld_doesntExists(name: $name)
      }`,
      })

    expect(response.statusCode).toBe(400)
    expect(response.body.errors[0].message).toEqual(
      'Cannot query field "helloWorld_doesntExists" on type "Query".',
    )
  })

  it('should return validation errors correctly', async () => {
    const resolvers = {
      helloWorld: resolver({
        params: {
          name: {
            type: 'string',
            validate: () => {
              return 'notUnique'
            },
          },
        },
        returns: 'string',
        async resolve({name}) {
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        variables: {
          name: 'Nico',
        },
        query: `query testOperation($name: String) {
          helloWorld(name: $name)
      }`,
      })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Validation Error: {name: notUnique}',
          locations: [
            {
              line: 2,
              column: 11,
            },
          ],
          path: ['helloWorld'],
          extensions: {
            isOrionError: true,
            isValidationError: true,
            hash: 'f3c9a8e163',
            code: 'validationError',
            info: {
              error: 'validationError',
              message: 'Validation Error',
              validationErrors: {
                name: 'notUnique',
              },
            },
          },
        },
      ],
      data: {
        helloWorld: null,
      },
    })
  })

  it('should return user errors correctly', async () => {
    const resolvers = {
      helloWorld: resolver({
        params: {
          name: {
            type: 'string',
          },
        },
        returns: 'string',
        async resolve({name}) {
          throw new UserError('code', 'message')
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        variables: {
          name: 'Nico',
        },
        query: `query testOperation($name: String) {
          helloWorld(name: $name)
      }`,
      })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      errors: [
        {
          message: 'message',
          locations: [
            {
              line: 2,
              column: 11,
            },
          ],
          path: ['helloWorld'],
          extensions: {
            isOrionError: true,
            isValidationError: false,
            code: 'code',
            hash: '6f9b9af3cd',
            info: {
              error: 'code',
              message: 'message',
            },
          },
        },
      ],
      data: {
        helloWorld: null,
      },
    })
  })

  it('should return server errors correctly', async () => {
    const resolvers = {
      helloWorld: resolver({
        params: {
          name: {
            type: 'string',
          },
        },
        returns: 'string',
        async resolve({name}) {
          throw new Error('message')
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        variables: {
          name: 'Nico',
        },
        query: `query testOperation($name: String) {
          helloWorld(name: $name)
      }`,
      })

    expect(response.statusCode).toBe(200)

    const hash = '6f9b9af3cd'
    expect(response.body).toEqual({
      errors: [
        {
          message: `message [${hash}]`,
          locations: [
            {
              line: 2,
              column: 11,
            },
          ],
          path: ['helloWorld'],
          extensions: {
            isOrionError: false,
            isValidationError: false,
            code: 'INTERNAL_SERVER_ERROR',
            hash: hash,
          },
        },
      ],
      data: {
        helloWorld: null,
      },
    })
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
        age: 20,
      }
    }

    const user = resolver({
      params: Params,
      returns: User,
      resolve,
    })

    const model = createModel({
      name: 'Model',
      schema: {
        user: {type: User},
      },
    })

    const modelMutation = resolver({
      params: Params,
      returns: [model],
      mutation: true,
      resolve,
    })

    const resolvers = {user, modelMutation}
    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        variables: {
          userId: '1',
        },
        query: `query ($userId: String) {
        user(userId: $userId) {
          name
          age
        }
      }`,
      })

    expect(response.statusCode).toBe(200)
    expect(response.body.data).toEqual({
      user: {
        name: 'Nico',
        age: 20,
      },
    })
  })

  it('Should pass graphql request info in fourth param', async () => {
    @TypedSchema()
    class User {
      @Prop()
      name: string

      @Prop()
      age: number
    }

    let resolveInfo: GraphQLResolveInfo

    const user = resolver({
      params: {},
      returns: User,
      async resolve(_params, _viewer, info) {
        resolveInfo = info
        return {
          name: 'Nico',
          age: 20,
        }
      },
    })

    const resolvers = {user}
    const app = express()
    await startGraphQL({
      resolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        query: `query {
        user {
          name
          age
        }
      }`,
      })

    expect(response.statusCode).toBe(200)
    expect(resolveInfo.fieldName).toEqual('user')
  })
})
