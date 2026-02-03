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

    // These would compile if output was 'any', but should fail with proper types
    // @ts-expect-error - name should be string, not number
    const _badOutput1: RouterOutputs['getUser'] = {name: 123, age: 30}
    // @ts-expect-error - missing required 'name' property
    const _badOutput2: RouterOutputs['createUser'] = {id: '123'}

    expect(router).toBeDefined()
    expect(_getUserInput.id).toBe('test')
    expect(_getUserOutput.name).toBe('test')
    expect(_createUserInput.email).toBe('test@test.com')
    expect(_createUserOutput.id).toBe('123')
  })

  it('should infer output types from resolve when no returns schema is provided', () => {
    const procedures = {
      // No returns schema - output inferred from resolve function
      getStatus: createTQuery({
        resolve: async () => ({status: 'ok', count: 42}),
      }),
      // With params but no returns
      getUserById: createTQuery({
        params: {id: {type: 'ID'}},
        resolve: async ({id}) => ({id, name: 'John', active: true}),
      }),
      // Mutation without returns
      updateStatus: createTMutation({
        params: {status: {type: 'string'}},
        resolve: async ({status}) => ({updated: true, newStatus: status}),
      }),
    }

    const router = buildRouter(procedures)
    type RouterOutputs = inferRouterOutputs<typeof router>

    // Valid assignments - types inferred from resolve
    const _status: RouterOutputs['getStatus'] = {status: 'ok', count: 42}
    const _user: RouterOutputs['getUserById'] = {id: '123', name: 'John', active: true}
    const _update: RouterOutputs['updateStatus'] = {updated: true, newStatus: 'active'}

    // These should fail with proper type inference
    // @ts-expect-error - status should be string, not number
    const _badStatus: RouterOutputs['getStatus'] = {status: 123, count: 42}
    // @ts-expect-error - active should be boolean, not string
    const _badUser: RouterOutputs['getUserById'] = {id: '123', name: 'John', active: 'yes'}
    // @ts-expect-error - updated should be boolean
    const _badUpdate: RouterOutputs['updateStatus'] = {updated: 'yes', newStatus: 'active'}

    expect(router).toBeDefined()
  })

  it('should handle procedures with no params and no returns schemas', async () => {
    const procedures = {
      ping: createTQuery({
        resolve: async () => 'pong',
      }),
      getTimestamp: createTQuery({
        resolve: async () => ({timestamp: Date.now(), server: 'main'}),
      }),
    }

    const router = buildRouter(procedures)
    type RouterOutputs = inferRouterOutputs<typeof router>

    // Type checks
    const _ping: RouterOutputs['ping'] = 'pong'
    const _timestamp: RouterOutputs['getTimestamp'] = {timestamp: 123456, server: 'main'}

    // @ts-expect-error - should be string, not number
    const _badPing: RouterOutputs['ping'] = 123
    // @ts-expect-error - missing server property
    const _badTimestamp: RouterOutputs['getTimestamp'] = {timestamp: 123456}

    // Runtime test
    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).get('/trpc/ping')
    expect(response.body.result.data).toBe('pong')
  })

  it('should infer complex output types including arrays and nested objects', () => {
    const procedures = {
      getUsers: createTQuery({
        resolve: async () => [
          {id: '1', name: 'John', metadata: {role: 'admin'}},
          {id: '2', name: 'Jane', metadata: {role: 'user'}},
        ],
      }),
      getNestedData: createTQuery({
        resolve: async () => ({
          users: [{id: '1', name: 'John'}],
          pagination: {page: 1, total: 100},
          filters: {active: true, roles: ['admin', 'user']},
        }),
      }),
    }

    const router = buildRouter(procedures)
    type RouterOutputs = inferRouterOutputs<typeof router>

    // Valid assignments
    const _users: RouterOutputs['getUsers'] = [
      {id: '1', name: 'John', metadata: {role: 'admin'}},
    ]
    const _nested: RouterOutputs['getNestedData'] = {
      users: [{id: '1', name: 'John'}],
      pagination: {page: 1, total: 100},
      filters: {active: true, roles: ['admin']},
    }

    // @ts-expect-error - metadata.role should be string
    const _badUsers: RouterOutputs['getUsers'] = [{id: '1', name: 'John', metadata: {role: 123}}]
    // @ts-expect-error - pagination.page should be number
    const _badNested: RouterOutputs['getNestedData'] = {users: [], pagination: {page: '1', total: 100}, filters: {active: true, roles: []}}

    expect(router).toBeDefined()
  })

  it('should still clean output at runtime when returns schema is provided', async () => {
    const procedures = {
      // With returns schema - should clean output
      withSchema: createTQuery({
        returns: {name: {type: 'string'}},
        resolve: async () => ({name: 'Test', extraField: 'removed', anotherExtra: 123}),
      }),
      // Without returns schema - should pass through as-is
      withoutSchema: createTQuery({
        resolve: async () => ({name: 'Test', extraField: 'kept', anotherExtra: 123}),
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    // With schema - extra fields should be removed
    const responseWith = await request(app).get('/trpc/withSchema')
    expect(responseWith.body.result.data).toEqual({name: 'Test'})
    expect(responseWith.body.result.data.extraField).toBeUndefined()

    // Without schema - extra fields should be kept
    const responseWithout = await request(app).get('/trpc/withoutSchema')
    expect(responseWithout.body.result.data).toEqual({
      name: 'Test',
      extraField: 'kept',
      anotherExtra: 123,
    })
  })

  it('should infer input types correctly with and without params schema', () => {
    const procedures = {
      withParams: createTQuery({
        params: {id: {type: 'ID'}, filter: {type: 'string', optional: true}},
        resolve: async ({id, filter}) => ({id, filter}),
      }),
      withoutParams: createTQuery({
        resolve: async () => ({result: 'no params needed'}),
      }),
    }

    const router = buildRouter(procedures)
    type RouterInputs = inferRouterInputs<typeof router>

    // With params - should require id, filter optional
    const _validInput: RouterInputs['withParams'] = {id: '123'}
    const _validInputWithFilter: RouterInputs['withParams'] = {id: '123', filter: 'active'}

    // @ts-expect-error - id is required
    const _missingId: RouterInputs['withParams'] = {filter: 'active'}
    // @ts-expect-error - id should be string
    const _wrongIdType: RouterInputs['withParams'] = {id: 123}

    expect(router).toBeDefined()
  })

  it('should work with mutation type inference without returns schema', async () => {
    const procedures = {
      createItem: createTMutation({
        params: {name: {type: 'string'}},
        resolve: async ({name}) => ({
          id: 'generated-id',
          name,
          createdAt: new Date().toISOString(),
        }),
      }),
      deleteItem: createTMutation({
        params: {id: {type: 'ID'}},
        resolve: async ({id}) => ({success: true, deletedId: id}),
      }),
    }

    const router = buildRouter(procedures)
    type RouterOutputs = inferRouterOutputs<typeof router>

    // Type checks
    const _created: RouterOutputs['createItem'] = {
      id: 'test',
      name: 'item',
      createdAt: '2024-01-01',
    }
    const _deleted: RouterOutputs['deleteItem'] = {success: true, deletedId: '123'}

    // @ts-expect-error - missing createdAt
    const _badCreated: RouterOutputs['createItem'] = {id: 'test', name: 'item'}
    // @ts-expect-error - success should be boolean
    const _badDeleted: RouterOutputs['deleteItem'] = {success: 'yes', deletedId: '123'}

    // Runtime test
    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).post('/trpc/createItem').send({name: 'Test Item'})
    expect(response.body.result.data.name).toBe('Test Item')
    expect(response.body.result.data.id).toBe('generated-id')
    expect(response.body.result.data.createdAt).toBeDefined()
  })
})
