import 'reflect-metadata'
import {Service} from '@orion-js/services'
import {
  Query,
  getServiceResolvers,
  Resolvers,
  Mutation,
  ModelResolvers,
  ModelResolver,
  getServiceModelResolvers
} from './index'
import {createResolverServiceMiddleware, UseMiddleware} from './middlewares'
import {createResolverMiddleware} from '@orion-js/resolvers'
import {Prop, TypedSchema} from '@orion-js/typed-model'

describe('Resolvers with service injection and middlewares', () => {
  it('should allow to pass resolver middlewares with decorators', async () => {
    expect.assertions(3)
    @Service()
    class ExampleRepo {
      getLastName() {
        return 'Lopez'
      }
    }

    const exampleMiddleware = createResolverMiddleware(async (executeOptions, next) => {
      const result = await next()
      expect(result).toBe('intercepted2')
      return 'intercepted'
    })

    const CheckRoles = (rolesToCheck: string[]) => {
      return createResolverServiceMiddleware(async (executeOptions, next) => {
        // check roles here
        await next()
        return 'intercepted2'
      })
    }

    @Resolvers()
    class ExampleResolverService {
      @Query({
        params: {name: {type: 'string'}},
        returns: String
      })
      @UseMiddleware(exampleMiddleware)
      @CheckRoles(['admin'])
      async sayHi(params) {
        return 'text'
      }
    }

    const resolvers = getServiceResolvers(ExampleResolverService)

    expect(resolvers.sayHi).toBeDefined()

    const result = await resolvers.sayHi.execute({params: {name: 'Orion'}})
    expect(result).toBe(`intercepted`)
  })

  it('show also work with model resolvers', async () => {
    @TypedSchema()
    class Person {
      @Prop()
      name: string
    }

    const NiceToMeetYou = createResolverServiceMiddleware(async (executeOptions, next) => {
      const result = await next()
      return `${result}, nice to meet you`
    })

    @ModelResolvers(Person)
    class PersonResolvers {
      @ModelResolver({returns: String})
      @NiceToMeetYou
      async getAge(person: Person) {
        return `hello ${person.name}`
      }
    }

    const data = getServiceModelResolvers(PersonResolvers)

    const item: Person = {name: 'Orion'}
    const result = await data.Person.getAge.execute({parent: item})
    expect(result).toBe(`hello Orion, nice to meet you`)
  })
})
