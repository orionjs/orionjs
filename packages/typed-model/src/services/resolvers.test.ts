import 'reflect-metadata'
import {Inject, Service} from '@orion-js/services'
import {Prop, TypedSchema} from '..'
import {getModelForClass} from '../factories'
import {ModelResolver, Query, getServiceResolvers, Resolvers, Model, Mutation} from './resolvers'

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
        returns: String
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

  it('show allow to pass a service with resolvers to typed model', async () => {
    @Service()
    class AgeRepo {
      getAge(name) {
        return `${name} is 100 years old`
      }
    }

    @TypedSchema()
    class PersonSchema {
      @Prop()
      name: string
    }

    @Model(PersonSchema)
    class PersonModel {
      @Inject()
      private repo: AgeRepo

      @ModelResolver({returns: String})
      async getAge(person: PersonSchema) {
        const result = this.repo.getAge(person.name)

        return result
      }
    }

    const model = getModelForClass(PersonModel)
    const item = model.initItem({name: 'Orion'})

    expect(await item.getAge()).toBe(`Orion is 100 years old`)
  })
})
