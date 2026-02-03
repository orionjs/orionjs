import {describe, it, expect, expectTypeOf} from 'vitest'
import {Inject, Service} from '@orion-js/services'
import {schemaWithName} from '@orion-js/schema'
import {Procedures, TQuery, TMutation, getTProcedures} from './global'
import {createTQuery} from '../createTQuery'
import {createTMutation} from '../createTMutation'
import {buildRouter} from '../buildRouter'
import {t} from '../trpc'
import {inferRouterInputs, inferRouterOutputs} from '@trpc/server'

describe('Procedures with service injection', () => {
  it('should work with the v4 syntax', async () => {
    @Service()
    class DataService {
      getLastName() {
        return 'Lopez'
      }
    }

    @Procedures()
    class ExampleProcedures {
      @Inject(() => DataService)
      private dataService: DataService

      @TQuery()
      example = createTQuery({
        params: {name: {type: 'string'}},
        returns: {name: {type: 'string'}},
        resolve: async (params, viewer) => ({
          name: `${params.name} ${this.dataService.getLastName()}`,
        }),
      })

      @TMutation()
      example2 = createTMutation({
        params: {name: {type: 'string'}},
        returns: {name: {type: 'string'}},
        resolve: async (params, viewer) => ({
          name: `${params.name} ${this.dataService.getLastName()}`,
        }),
      })
    }

    const procedures = getTProcedures(ExampleProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    expect(procedures.example).toBeDefined()
    expect(procedures.example2).toBeDefined()

    const result = await caller.example({name: 'Orion'})
    expect(result?.name).toBe('Orion Lopez')

    const result2 = await caller.example2({name: 'Test'})
    expect(result2?.name).toBe('Test Lopez')
  })

  it('should work with schemaWithName', async () => {
    const ParamsSchema = schemaWithName('Params', {
      name: {type: 'string'},
    })

    const ReturnsSchema = schemaWithName('Returns', {
      fullName: {type: 'string'},
    })

    @Procedures()
    class ProceduresWithSchema {
      @TQuery()
      greet = createTQuery({
        params: ParamsSchema,
        returns: ReturnsSchema,
        resolve: async (params, viewer) => ({
          fullName: `Hello ${params.name}`,
        }),
      })
    }

    const procedures = getTProcedures(ProceduresWithSchema)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    expect(procedures.greet).toBeDefined()
    const result = await caller.greet({name: 'World'})
    expect(result?.fullName).toBe('Hello World')
  })

  it('should throw error when class is not decorated with @Procedures', () => {
    @Service()
    class NotProcedures {
      @TQuery()
      test = createTQuery({
        returns: 'string',
        resolve: async (params, viewer) => 'test',
      })
    }

    expect(() => getTProcedures(NotProcedures)).toThrow(
      'You must pass a class decorated with @Procedures',
    )
  })

  it('should validate input params', async () => {
    @Procedures()
    class ValidationProcedures {
      @TQuery()
      validate = createTQuery({
        params: {
          email: {type: 'email'},
        },
        returns: 'string',
        resolve: async (params, viewer) => params.email,
      })
    }

    const procedures = getTProcedures(ValidationProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    await expect(caller.validate({email: 'not-an-email'})).rejects.toThrow()

    const result = await caller.validate({email: 'test@example.com'})
    expect(result).toBe('test@example.com')
  })

  it('should pass viewer to resolve function', async () => {
    @Procedures()
    class ViewerProcedures {
      @TQuery()
      getUser = createTQuery({
        returns: {userId: {type: 'string'}},
        resolve: async (params, viewer) => ({
          userId: viewer?.userId || 'no-user',
        }),
      })
    }

    const procedures = getTProcedures(ViewerProcedures)
    const router = buildRouter(procedures)

    // Test with viewer
    const callerWithViewer = t.createCallerFactory(router)({viewer: {userId: 'user-123'}})
    const result1 = await callerWithViewer.getUser({})
    expect(result1?.userId).toBe('user-123')

    // Test without viewer
    const callerNoViewer = t.createCallerFactory(router)({viewer: null})
    const result2 = await callerNoViewer.getUser({})
    expect(result2?.userId).toBe('no-user')
  })

  it('should preserve types for client-side router usage', async () => {
    @Procedures()
    class TypedProcedures {
      @TQuery()
      getUser = createTQuery({
        params: {id: {type: 'ID'}},
        returns: {name: {type: 'string'}},
        resolve: async ({id}) => ({name: 'John'}),
      })

      @TMutation()
      createUser = createTMutation({
        params: {name: {type: 'string'}},
        returns: {id: {type: 'ID'}, name: {type: 'string'}},
        resolve: async ({name}) => ({id: '123', name}),
      })
    }

    const procedures = getTProcedures(TypedProcedures)

    // Verify the procedures object has the correct keys
    expectTypeOf(procedures).toHaveProperty('getUser')
    expectTypeOf(procedures).toHaveProperty('createUser')

    // Build router and verify it can be used for type exports
    const router = buildRouter(procedures)
    type AppRouter = typeof router

    // The router should have the procedure keys
    expectTypeOf(router).toHaveProperty('getUser')
    expectTypeOf(router).toHaveProperty('createUser')
  })

  it('should infer output types from resolve when no returns schema in @Procedures class', async () => {
    @Procedures()
    class InferredOutputProcedures {
      @TQuery()
      getStatus = createTQuery({
        resolve: async () => ({status: 'healthy', uptime: 12345}),
      })

      @TQuery()
      getUserData = createTQuery({
        params: {userId: {type: 'ID'}},
        resolve: async ({userId}) => ({
          id: userId,
          name: 'John Doe',
          metadata: {lastLogin: new Date().toISOString(), visits: 42},
        }),
      })

      @TMutation()
      updateConfig = createTMutation({
        params: {key: {type: 'string'}, value: {type: 'string'}},
        resolve: async ({key, value}) => ({
          success: true,
          updatedKey: key,
          previousValue: null as string | null,
        }),
      })
    }

    const procedures = getTProcedures(InferredOutputProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Runtime tests
    const statusResult = await caller.getStatus({})
    expect(statusResult.status).toBe('healthy')
    expect(statusResult.uptime).toBe(12345)

    const userData = await caller.getUserData({userId: 'user-1'})
    expect(userData.id).toBe('user-1')
    expect(userData.name).toBe('John Doe')
    expect(userData.metadata.visits).toBe(42)

    const configResult = await caller.updateConfig({key: 'theme', value: 'dark'})
    expect(configResult.success).toBe(true)
    expect(configResult.updatedKey).toBe('theme')

    // Type inference tests
    type RouterOutputs = inferRouterOutputs<typeof router>

    // Valid assignments
    const _status: RouterOutputs['getStatus'] = {status: 'ok', uptime: 100}
    const _user: RouterOutputs['getUserData'] = {
      id: '1',
      name: 'Jane',
      metadata: {lastLogin: '2024-01-01', visits: 10},
    }
    const _config: RouterOutputs['updateConfig'] = {
      success: false,
      updatedKey: 'x',
      previousValue: 'old',
    }

    // @ts-expect-error - uptime should be number
    const _badStatus: RouterOutputs['getStatus'] = {status: 'ok', uptime: '100'}
    // @ts-expect-error - metadata.visits should be number
    const _badUser: RouterOutputs['getUserData'] = {id: '1', name: 'Jane', metadata: {lastLogin: '2024-01-01', visits: 'many'}}
    // @ts-expect-error - success should be boolean
    const _badConfig: RouterOutputs['updateConfig'] = {success: 'yes', updatedKey: 'x', previousValue: null}

    expect(router).toBeDefined()
  })

  it('should handle @Procedures with mixed schema and inferred types', async () => {
    @Procedures()
    class MixedProcedures {
      // With both schemas - output cleaned by schema
      @TQuery()
      withBothSchemas = createTQuery({
        params: {id: {type: 'ID'}},
        returns: {name: {type: 'string'}},
        resolve: async ({id}) => ({name: 'Test', extra: 'removed'}),
      })

      // With only params schema - output inferred from resolve
      @TQuery()
      withOnlyParams = createTQuery({
        params: {search: {type: 'string'}},
        resolve: async ({search}) => ({
          results: [{id: '1', title: `Result for ${search}`}],
          totalCount: 1,
        }),
      })

      // With only returns schema - input accepts anything
      @TMutation()
      withOnlyReturns = createTMutation({
        returns: {success: {type: 'boolean'}},
        resolve: async () => ({success: true, extra: 'will be removed'}),
      })

      // With no schemas - fully inferred
      @TQuery()
      fullyInferred = createTQuery({
        resolve: async () => ({
          serverTime: Date.now(),
          version: '1.0.0',
        }),
      })
    }

    const procedures = getTProcedures(MixedProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Runtime tests for schema cleaning
    const withBoth = await caller.withBothSchemas({id: '123'})
    expect(withBoth.name).toBe('Test')
    expect((withBoth as any).extra).toBeUndefined() // cleaned by returns schema

    const withReturns = await caller.withOnlyReturns({})
    expect(withReturns.success).toBe(true)
    expect((withReturns as any).extra).toBeUndefined() // cleaned by returns schema

    // Runtime tests for non-schema procedures
    const withParams = await caller.withOnlyParams({search: 'test'})
    expect(withParams.results[0].title).toBe('Result for test')
    expect(withParams.totalCount).toBe(1)

    const inferred = await caller.fullyInferred({})
    expect(inferred.version).toBe('1.0.0')
    expect(typeof inferred.serverTime).toBe('number')

    // Type tests
    type RouterOutputs = inferRouterOutputs<typeof router>
    type RouterInputs = inferRouterInputs<typeof router>

    // Output types
    const _withParams: RouterOutputs['withOnlyParams'] = {
      results: [{id: '1', title: 'test'}],
      totalCount: 5,
    }
    const _inferred: RouterOutputs['fullyInferred'] = {serverTime: 123, version: '2.0'}

    // Input types
    const _paramsInput: RouterInputs['withOnlyParams'] = {search: 'query'}
    const _bothInput: RouterInputs['withBothSchemas'] = {id: 'abc'}

    // @ts-expect-error - results should be array
    const _badWithParams: RouterOutputs['withOnlyParams'] = {results: 'not array', totalCount: 1}
    // @ts-expect-error - search is required
    const _badInput: RouterInputs['withOnlyParams'] = {}

    expect(router).toBeDefined()
  })

  it('should correctly infer array return types in @Procedures', async () => {
    @Procedures()
    class ArrayProcedures {
      @TQuery()
      getItems = createTQuery({
        resolve: async () => [
          {id: '1', name: 'Item 1', tags: ['a', 'b']},
          {id: '2', name: 'Item 2', tags: ['c']},
        ],
      })

      @TQuery()
      getNumbers = createTQuery({
        resolve: async () => [1, 2, 3, 4, 5],
      })

      @TQuery()
      getStrings = createTQuery({
        resolve: async () => ['hello', 'world'],
      })
    }

    const procedures = getTProcedures(ArrayProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Runtime tests
    const items = await caller.getItems({})
    expect(items).toHaveLength(2)
    expect(items[0].tags).toContain('a')

    const numbers = await caller.getNumbers({})
    expect(numbers).toEqual([1, 2, 3, 4, 5])

    // Type tests
    type RouterOutputs = inferRouterOutputs<typeof router>

    const _items: RouterOutputs['getItems'] = [{id: 'x', name: 'y', tags: []}]
    const _nums: RouterOutputs['getNumbers'] = [10, 20]
    const _strs: RouterOutputs['getStrings'] = ['a', 'b', 'c']

    // @ts-expect-error - should be array of objects with id, name, tags
    const _badItems: RouterOutputs['getItems'] = [{id: 'x', name: 'y'}]
    // @ts-expect-error - should be array of numbers
    const _badNums: RouterOutputs['getNumbers'] = ['1', '2']

    expect(router).toBeDefined()
  })

  it('should work with dependency injection and inferred types', async () => {
    @Service()
    class ConfigService {
      getConfig() {
        return {
          appName: 'TestApp',
          version: '2.0.0',
          features: {darkMode: true, notifications: false},
        }
      }
    }

    @Service()
    class UserService {
      getUsers() {
        return [
          {id: '1', email: 'user1@test.com', role: 'admin' as const},
          {id: '2', email: 'user2@test.com', role: 'user' as const},
        ]
      }
    }

    @Procedures()
    class InjectedProcedures {
      @Inject(() => ConfigService)
      private configService: ConfigService

      @Inject(() => UserService)
      private userService: UserService

      @TQuery()
      getAppConfig = createTQuery({
        resolve: async () => this.configService.getConfig(),
      })

      @TQuery()
      listUsers = createTQuery({
        resolve: async () => ({
          users: this.userService.getUsers(),
          total: this.userService.getUsers().length,
        }),
      })

      @TQuery()
      getUsersByRole = createTQuery({
        params: {role: {type: 'string'}},
        resolve: async ({role}) => {
          const users = this.userService.getUsers()
          return users.filter(u => u.role === role)
        },
      })
    }

    const procedures = getTProcedures(InjectedProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Runtime tests
    const config = await caller.getAppConfig({})
    expect(config.appName).toBe('TestApp')
    expect(config.features.darkMode).toBe(true)

    const userList = await caller.listUsers({})
    expect(userList.users).toHaveLength(2)
    expect(userList.total).toBe(2)

    const admins = await caller.getUsersByRole({role: 'admin'})
    expect(admins).toHaveLength(1)
    expect(admins[0].email).toBe('user1@test.com')

    // Type tests
    type RouterOutputs = inferRouterOutputs<typeof router>

    const _config: RouterOutputs['getAppConfig'] = {
      appName: 'App',
      version: '1.0',
      features: {darkMode: false, notifications: true},
    }

    // @ts-expect-error - features.darkMode should be boolean
    const _badConfig: RouterOutputs['getAppConfig'] = {appName: 'App', version: '1.0', features: {darkMode: 'yes', notifications: true}}

    expect(router).toBeDefined()
  })
})
