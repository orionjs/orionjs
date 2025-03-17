import {Service} from '@orion-js/services'
import {describe, it, expect} from 'vitest'
import {
  Query,
  getServiceResolvers,
  Resolvers,
  ModelResolvers,
  ModelResolver,
  getServiceModelResolvers,
} from './index'
import {ResolverParams, ResolverReturns, UseMiddleware} from './middlewares'
import {createResolverMiddleware} from '@orion-js/resolvers'
import {Prop, TypedSchema} from '@orion-js/typed-model'

describe('Resolvers with service injection and middlewares', () => {
  it('should allow to pass resolver middlewares with decorators', async () => {
    expect.assertions(3)
    @Service()
    class _ExampleRepo {
      getLastName() {
        return 'Lopez'
      }
    }

    const exampleMiddleware = createResolverMiddleware(async (_executeOptions, next) => {
      const result = await next()
      expect(result).toBe('intercepted2')
      return 'intercepted'
    })

    const CheckRoles = (_rolesToCheck: string[]) => {
      return UseMiddleware(async (_executeOptions, next) => {
        // check roles here
        await next()
        return 'intercepted2'
      })
    }

    @Resolvers()
    class ExampleResolverService {
      @Query()
      @ResolverParams({name: {type: 'string'}})
      @ResolverReturns({name: {type: 'string'}})
      @UseMiddleware(exampleMiddleware)
      @CheckRoles(['admin'])
      async sayHi() {
        return {name: 'text'}
      }
    }

    const resolvers = getServiceResolvers(ExampleResolverService)

    expect(resolvers.sayHi).toBeDefined()

    const result = await resolvers.sayHi.execute({params: {name: 'Orion'}})
    expect(result).toBe('intercepted')
  })

  it('show also work with model resolvers', async () => {
    @TypedSchema()
    class Person {
      @Prop({type: String})
      name: string
    }

    const NiceToMeetYou = UseMiddleware(async (_executeOptions, next) => {
      const result = await next()
      return `${result}, nice to meet you`
    })

    @ModelResolvers(Person)
    class PersonResolvers {
      @ModelResolver()
      @ResolverReturns(String)
      @NiceToMeetYou
      async getAge(person: Person) {
        return `hello ${person.name}`
      }
    }

    const data = getServiceModelResolvers(PersonResolvers)

    const item: Person = {name: 'Orion'}
    const result = await data.Person.getAge.execute({parent: item})
    expect(result).toBe('hello Orion, nice to meet you')
  })

  it('should pass the mutation name in the middleware', async () => {
    let mutationName = ''

    const exampleMiddleware = createResolverMiddleware(async (executeOptions, next) => {
      mutationName = executeOptions.options.resolverId
      await next()
    })

    @Resolvers()
    class ExampleResolverService {
      @Query()
      @ResolverReturns(String)
      @UseMiddleware(exampleMiddleware)
      async sayHi() {
        return 'text'
      }
    }

    const resolvers = getServiceResolvers(ExampleResolverService)
    await resolvers.sayHi.execute({params: {}})
    expect(mutationName).toBe('sayHi')
  })
})
