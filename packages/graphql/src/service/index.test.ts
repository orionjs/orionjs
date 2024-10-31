import 'reflect-metadata'
import {Inject, Service} from '@orion-js/services'
import {Query, getServiceResolvers, Resolvers, Mutation} from './index'

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
      @Inject()
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
})
