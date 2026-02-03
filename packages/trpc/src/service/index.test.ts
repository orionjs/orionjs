import {describe, it, expect, expectTypeOf} from 'vitest'
import {Inject, Service} from '@orion-js/services'
import {schemaWithName} from '@orion-js/schema'
import {Procedures, TQuery, TMutation, getTProcedures} from './global'
import {createTQuery} from '../createTQuery'
import {createTMutation} from '../createTMutation'
import {buildRouter} from '../buildRouter'

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
        resolve: async (params, viewer) => this.example.resolve(params, viewer),
      })
    }

    const procedures = getTProcedures(ExampleProcedures)

    expect(procedures.example).toBeDefined()
    expect(procedures.example.mutation).toBe(false)

    const result = await procedures.example.execute({params: {name: 'Orion'}, viewer: null})
    expect(result?.name).toBe('Orion Lopez')

    expect(procedures.example2).toBeDefined()
    expect(procedures.example2.mutation).toBe(true)
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

    expect(procedures.greet).toBeDefined()
    const result = await procedures.greet.execute({params: {name: 'World'}, viewer: null})
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

    await expect(
      procedures.validate.execute({params: {email: 'not-an-email'}, viewer: null}),
    ).rejects.toThrow()

    const result = await procedures.validate.execute({params: {email: 'test@example.com'}, viewer: null})
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

    const result1 = await procedures.getUser.execute({params: {}, viewer: {userId: 'user-123'}})
    expect(result1?.userId).toBe('user-123')

    const result2 = await procedures.getUser.execute({params: {}, viewer: null})
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
})
