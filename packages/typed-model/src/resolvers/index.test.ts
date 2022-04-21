import 'reflect-metadata'
import {Inject, Service} from '@orion-js/services'
import {Prop, TypedModel} from '..'
import {getModelForClass} from '../factories'
import {CreateModelResolver, CreateResolver, getServiceResolvers} from '.'

describe('Resolvers with service injection', () => {
  it('should allow to pass a service as resolve', async () => {
    @Service()
    class ExampleRepo {
      getLastName() {
        return 'Lopez'
      }
    }

    @Service()
    class ExampleResolverService {
      @Inject()
      private repo: ExampleRepo

      @CreateResolver({
        thisService: ExampleResolverService,
        params: {name: {type: 'string'}},
        returns: String
      })
      async sayHi(params) {
        return this.addAge(`My name is ${params.name} ${this.repo.getLastName()}`)
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

  it('show allow to pass a service with resolvers to typed model', async () => {
    @Service()
    class AgeRepo {
      getAge(name) {
        return `${name} is 100 years old`
      }
    }

    @Service()
    class PersonResolvers {
      @Inject()
      private repo: AgeRepo

      @CreateModelResolver({
        thisService: PersonResolvers,
        returns: String
      })
      async getAge(person) {
        const result = this.repo.getAge(person.name)

        return result
      }
    }

    @TypedModel({resolversService: PersonResolvers})
    class Person {
      @Prop()
      name: string
    }

    const model = getModelForClass(Person)
    const item = model.initItem({name: 'Orion'})

    expect(await item.getAge()).toBe(`Orion is 100 years old`)
  })
})
