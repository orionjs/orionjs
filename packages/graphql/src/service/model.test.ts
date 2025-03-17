import {Inject, Service} from '@orion-js/services'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {createModelResolver, getServiceModelResolvers, ModelResolver, ModelResolvers} from './model'
import {express} from '@orion-js/http'
import request from 'supertest'
import startGraphQL from '../startGraphQL'
import {cleanResolvers} from '../cleanResolvers'
import {createQuery, getServiceResolvers, Query, Resolvers} from './global'
import {describe, it, expect, beforeEach} from 'vitest'
import {InferSchemaType, schemaWithName} from '@orion-js/schema'

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
      @Prop({type: String})
      name: string
    }

    @ModelResolvers(Person)
    class PersonResolvers {
      @Inject(() => AgeRepo)
      private repo: AgeRepo

      @ModelResolver({returns: String})
      async getAge(person: Person) {
        const result = this.repo.getAge(person.name)
        return result
      }
    }

    const data = getServiceModelResolvers(PersonResolvers)

    console.log(data.Person.getAge)

    const item: Person = {name: 'Orion'}
    const result = await data.Person.getAge.execute({parent: item})
    expect(result).toBe('Orion is 100 years old')
  })

  it('should startGraphQL and make a request with the new syntax', async () => {
    const PersonSchema = schemaWithName('Person', {
      name: {
        type: 'string',
      },
    })

    type PersonType = InferSchemaType<typeof PersonSchema>

    @ModelResolvers(PersonSchema)
    class PersonResolvers {
      @ModelResolver()
      sayHi = createModelResolver<PersonType>({
        returns: String,
        resolve: async person => {
          return `My name is ${person.name}`
        },
      })
    }

    @Resolvers()
    class GlobalResolvers {
      @Query()
      person = createQuery({
        params: {name: {type: 'string'}},
        returns: PersonSchema,
        resolve: async params => {
          return {name: `(the name is ${params.name})`}
        },
      })
    }

    const resolvers = getServiceResolvers(GlobalResolvers)
    const modelResolvers = getServiceModelResolvers(PersonResolvers)

    const app = express()
    await startGraphQL({
      resolvers,
      modelResolvers,
      app,
    })

    const response = await request(app)
      .post('/graphql')
      .send({
        operationName: 'testOperation',
        query: `query testOperation {
        person(name: "Orion") {
          sayHi
        }
      }`,
      })

    expect(response.statusCode).toBe(200)
    expect(response.body.data).toEqual({person: {sayHi: 'My name is (the name is Orion)'}})
  })
})
