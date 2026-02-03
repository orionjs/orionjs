import {describe, it, expect, expectTypeOf} from 'vitest'
import request from 'supertest'
import {express} from '@orion-js/http'
import {inferRouterInputs, inferRouterOutputs} from '@trpc/server'
import {startTRPC} from './startTRPC'
import {createTQuery} from './createTQuery'
import {createTMutation} from './createTMutation'
import {buildRouter} from './buildRouter'

describe('startTRPC', () => {
  it('should start tRPC and make a query request', async () => {
    const procedures = {
      helloWorld: createTQuery({
        params: {name: {type: 'string'}},
        returns: 'string',
        resolve: async ({name}) => {
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app)
      .get('/trpc/helloWorld')
      .query({input: JSON.stringify({name: 'Nico'})})

    expect(response.body.result.data).toBe('Hello Nico')
  })

  it('should return validation errors correctly', async () => {
    const procedures = {
      helloWorld: createTQuery({
        params: {
          name: {type: 'string', validate: () => 'notUnique'},
        },
        returns: 'string',
        resolve: async ({name}) => `Hello ${name}`,
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app)
      .get('/trpc/helloWorld')
      .query({input: JSON.stringify({name: 'Nico'})})

    expect(response.body.error.data.isValidationError).toBe(true)
  })

  it('should handle mutations', async () => {
    const procedures = {
      createUser: createTMutation({
        params: {name: {type: 'string'}},
        returns: {name: {type: 'string'}},
        resolve: async ({name}) => ({name}),
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).post('/trpc/createUser').send({name: 'Test'})

    expect(response.body.result.data.name).toBe('Test')
  })

  it('should handle procedures without params', async () => {
    const procedures = {
      getStatus: createTQuery({
        returns: 'string',
        resolve: async () => 'ok',
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).get('/trpc/getStatus')

    expect(response.body.result.data).toBe('ok')
  })

  it('should use custom path', async () => {
    const procedures = {
      test: createTQuery({
        returns: 'string',
        resolve: async () => 'test',
      }),
    }

    const app = express()
    await startTRPC({procedures, app, path: '/api/trpc'})

    const response = await request(app).get('/api/trpc/test')
    expect(response.body.result.data).toBe('test')
  })

  it('should clean output according to schema', async () => {
    const procedures = {
      getUser: createTQuery({
        returns: {name: {type: 'string'}},
        resolve: async () => ({name: 'Test', extraField: 'should be removed'}),
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).get('/trpc/getUser')

    expect(response.body.result.data).toEqual({name: 'Test'})
    expect(response.body.result.data.extraField).toBeUndefined()
  })

  it('should pass viewer as second argument', async () => {
    const procedures = {
      getViewer: createTQuery({
        returns: {userId: {type: 'string'}},
        resolve: async (params, viewer) => {
          return {userId: viewer?.userId || 'anonymous'}
        },
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).get('/trpc/getViewer')

    expect(response.body.result.data.userId).toBe('anonymous')
  })

  it('should return typed router for client usage', async () => {
    const procedures = {
      getUser: createTQuery({
        params: {id: {type: 'ID'}},
        returns: {name: {type: 'string'}},
        resolve: async ({id}) => ({name: 'John'}),
      }),
      createUser: createTMutation({
        params: {name: {type: 'string'}},
        returns: {id: {type: 'ID'}, name: {type: 'string'}},
        resolve: async ({name}) => ({id: '123', name}),
      }),
    }

    const app = express()
    const {router} = await startTRPC({procedures, app})

    // Verify the router type can be exported for client usage
    type AppRouter = typeof router

    // The router should have the procedure keys
    expectTypeOf(router).toHaveProperty('getUser')
    expectTypeOf(router).toHaveProperty('createUser')

    // Verify buildRouter also works
    const router2 = buildRouter(procedures)
    expectTypeOf(router2).toHaveProperty('getUser')
    expectTypeOf(router2).toHaveProperty('createUser')
  })

  it('should correctly infer input and output types from router', () => {
    const procedures = {
      getUser: createTQuery({
        params: {id: {type: 'ID'}},
        returns: {name: {type: 'string'}, age: {type: 'integer', optional: true}},
        resolve: async ({id}) => ({name: 'John', age: 30}),
      }),
      createUser: createTMutation({
        params: {name: {type: 'string'}, email: {type: 'email'}},
        returns: {id: {type: 'ID'}, name: {type: 'string'}},
        resolve: async ({name, email}) => ({id: '123', name}),
      }),
    }

    const router = buildRouter(procedures)
    type AppRouter = typeof router
    type RouterInputs = inferRouterInputs<AppRouter>
    type RouterOutputs = inferRouterOutputs<AppRouter>

    // Type test using assignment - these will fail at compile time if types don't match
    const _getUserInput: RouterInputs['getUser'] = {id: 'test'}
    const _getUserOutput: RouterOutputs['getUser'] = {name: 'test', age: 30}
    const _createUserInput: RouterInputs['createUser'] = {name: 'test', email: 'test@test.com'}
    const _createUserOutput: RouterOutputs['createUser'] = {id: '123', name: 'test'}

    expect(router).toBeDefined()
    expect(_getUserInput.id).toBe('test')
    expect(_getUserOutput.name).toBe('test')
    expect(_createUserInput.email).toBe('test@test.com')
    expect(_createUserOutput.id).toBe('123')
  })
})
