import {Inject, Service} from '@orion-js/services'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {getServiceModelResolvers, ModelResolver, ModelResolvers} from './model'
import {express} from '@orion-js/http'
import request from 'supertest'
import startGraphQL from '../startGraphQL'
import {cleanResolvers} from '../cleanResolvers'
import {getServiceResolvers, Query, Resolvers} from './global'

describe('Service with graphql models', () => {
  beforeEach(() => {
    cleanResolvers()
  })

  it('show allow to pass a service with resolvers to typed model', async () => {
    @Service()
    class AgeRepo {
      getAge(name: string) {
        return `${name} is 100 years old`
      }
    }

    @TypedSchema()
    class Person {
      @Prop()
      name: string
    }

    @ModelResolvers(Person)
    class PersonResolvers {
      @Inject()
      private repo: AgeRepo

      @ModelResolver({returns: String})
      async getAge(person: Person) {
        const result = this.repo.getAge(person.name)
        return result
      }
    }

    const data = getServiceModelResolvers(PersonResolvers)

    const item: Person = {name: 'Orion'}
    const result = await data.Person.getAge.execute({parent: item})
    expect(result).toBe(`Orion is 100 years old`)
  })

  it('should startGraphQL and make a request', async () => {
    @TypedSchema()
    class Person {
      @Prop()
      name: string
    }

    @ModelResolvers(Person)
    class PersonResolvers {
      @ModelResolver({returns: String})
      async sayHi(person: Person) {
        return `My name is ${person.name}`
      }
    }

    @Resolvers()
    class GlobalResolvers {
      @Query({returns: Person})
      async person() {
        return {name: 'Orion'}
      }
    }

    const app = express()
    await startGraphQL({
      resolvers: getServiceResolvers(GlobalResolvers),
      modelsResolvers: getServiceModelResolvers(PersonResolvers),
      app
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        query: `query testOperation {
        person {
          sayHi
        }
      }`
      })

    expect(response.statusCode).toBe(200)
    expect(response.body.data).toEqual({person: {sayHi: 'My name is Orion'}})
  })
})
