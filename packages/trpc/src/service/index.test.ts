import {describe, it, expect} from 'vitest'
import {Inject, Service} from '@orion-js/services'
import {schemaWithName} from '@orion-js/schema'
import {TProcedures, TQuery, TMutation, getTProcedures} from './global'
import {createTQuery} from '../createTQuery'
import {createTMutation} from '../createTMutation'

describe('TProcedures with service injection', () => {
  it('should work with the v4 syntax', async () => {
    @Service()
    class DataService {
      getLastName() {
        return 'Lopez'
      }
    }

    @TProcedures()
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

    @TProcedures()
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

  it('should throw error when class is not decorated with @TProcedures', () => {
    @Service()
    class NotTProcedures {
      @TQuery()
      test = createTQuery({
        returns: 'string',
        resolve: async (params, viewer) => 'test',
      })
    }

    expect(() => getTProcedures(NotTProcedures)).toThrow(
      'You must pass a class decorated with @TProcedures',
    )
  })

  it('should validate input params', async () => {
    @TProcedures()
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
    @TProcedures()
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
})
