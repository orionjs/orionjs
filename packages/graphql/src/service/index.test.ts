import {Inject, Service} from '@orion-js/services'
import {Query, getServiceResolvers, Resolvers, Mutation, createQuery, createMutation} from './index'
import {describe, it, expect} from 'vitest'
import {schemaWithName} from '@orion-js/schema'
import {getModelForClass, Prop, TypedSchema} from '@orion-js/typed-model'

describe('Resolvers with service injection', () => {
  it('should allow to pass a service as resolve', async () => {
    @Service()
    class ExampleRepo {
      getLastName() {
        return 'Lopez'
      }
    }

    @Resolvers()
    class ExampleResolverService {
      @Inject(() => ExampleRepo)
      private repo: ExampleRepo

      @Query({
        params: {name: {type: 'string'}},
        returns: String,
      })
      async sayHi(params) {
        return this.addAge(`My name is ${params.name} ${this.repo.getLastName()}`)
      }

      @Mutation({returns: String})
      async setName() {
        this.repo.getLastName()
      }

      async addAge(params: string) {
        return `${params} and I'm 100 years old`
      }
    }

    const resolvers = getServiceResolvers(ExampleResolverService)

    expect(resolvers.sayHi).toBeDefined()

    const result = await resolvers.sayHi.execute({params: {name: 'Orion'}})
    expect(result).toBe(`My name is Orion Lopez and I'm 100 years old`)
  })

  it('should work with the new registerQuery v4', async () => {
    const params = schemaWithName('ExampleParams', {
      name: {type: 'string'},
    })
    const returns = schemaWithName('ExampleReturns', {
      name: {type: 'string'},
    })

    @Service()
    class DataService {
      getLastName() {
        return 'Lopez'
      }
    }

    @Resolvers()
    class ExampleResolvers {
      @Inject(() => DataService)
      private dataService: DataService

      @Query()
      example = createQuery({
        params,
        returns,
        resolve: async params => {
          return {
            name: `${params.name} ${this.dataService.getLastName()}`,
          }
        },
      })

      @Mutation()
      example2 = createMutation({
        params,
        returns,
        resolve: async params => {
          return await this.example.resolve(params)
        },
      })
    }

    const resolvers = getServiceResolvers(ExampleResolvers)
    expect(resolvers.example).toBeDefined()
    const result = await resolvers.example.execute({params: {name: 'Orion'}})
    expect(result?.name).toBe('Orion Lopez')

    const result2 = await resolvers.example2.execute({params: {name: 'Orions'}})
    expect(result2?.name).toBe('Orions Lopez')

    expect(resolvers.example2.mutation).toBe(true)
  })

  it('should work with cloneModel in params', async () => {
    @TypedSchema()
    class SubParamsTypedSchema {
      @Prop({type: String})
      name: string

      @Prop({type: String})
      age: number
    }

    const subParams = getModelForClass(SubParamsTypedSchema).clone({
      name: 'SubParams',
      pickFields: ['name'],
    })

    @Resolvers()
    class ExampleResolvers {
      @Query()
      example = createQuery({
        params: {
          subParams: {type: subParams as any}, // fails in ts, but should work in runtime
        },
        returns: 'string',
        resolve: async params => {
          return `${params.subParams.name}`
        },
      })
    }

    const resolvers = getServiceResolvers(ExampleResolvers)

    const result = await resolvers.example.execute({params: {subParams: {name: 'Orion'}}})
    expect(result).toBe('Orion')
  })
})
