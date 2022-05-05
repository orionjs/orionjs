import {ValidationError} from '@orion-js/schema'
import createCollection from '.'
import {TypedModel, Prop, getModelForClass, ResolverProp, TypedSchema} from '@orion-js/typed-model'
import {generateId} from '@orion-js/helpers'
import {resolver, modelResolver} from '@orion-js/resolvers'

describe('Collections with typed model', () => {
  const resolve = async (person: Person, {title}: {title: string}, viewer?: any) => {
    return `${title} ${person.firstName} ${person.lastName}`
  }

  const titleResolver = modelResolver({
    returns: String,
    resolve
  })

  @TypedModel()
  class Person {
    @Prop()
    firstName: string

    @Prop({max: 10})
    lastName: string

    @ResolverProp(titleResolver)
    title: typeof titleResolver.modelResolve
  }

  it('Should throw a validation error', async () => {
    const Persons = createCollection<Person>({
      name: generateId(),
      model: getModelForClass(Person)
    })
    expect.assertions(1)

    try {
      await Persons.insertOne({firstName: 'John', lastName: 'Really long last name'})
    } catch (e) {
      const validationError = e as ValidationError
      expect(validationError.validationErrors).toEqual({
        lastName: 'stringTooLong'
      })
    }
  })

  it('Should pass the resolvers to the items', async () => {
    const Persons = createCollection<Person>({
      name: generateId(),
      model: getModelForClass(Person)
    })

    await Persons.insertOne({
      firstName: 'John',
      lastName: 'Doe'
    })

    const person = await Persons.findOne({})
    const title = await person.title({title: 'Mr.'})

    expect(title).toBe('Mr. John Doe')
  })

  it('Should allow passing _id on insert', async () => {
    @TypedSchema()
    class PersonOptionalId {
      @Prop()
      _id: string

      @Prop()
      firstName: string

      @Prop({optional: true})
      lastName?: string
    }

    const Persons = createCollection<PersonOptionalId>({
      name: generateId(),
      model: PersonOptionalId
    })

    await Persons.insertOne({
      _id: '1',
      firstName: 'John'
    })

    const person = await Persons.findOne('1')

    expect(person.firstName).toBe('John')
  })

  it('Should validate but not initialize documents when passed typed schema', async () => {
    const resolve = async (person: Person, {title}: {title: string}, viewer?: any) => {
      return `${title} ${person.firstName} ${person.lastName}`
    }

    const titleResolver = modelResolver({
      returns: String,
      resolve
    })

    @TypedSchema()
    class Person {
      @Prop()
      firstName: string

      @Prop({max: 3})
      lastName: string

      @ResolverProp(titleResolver)
      title: typeof titleResolver.modelResolve
    }

    const Persons = createCollection<Person>({
      name: generateId(),
      schema: Person
    })

    expect.assertions(3)

    try {
      await Persons.insertOne({
        _id: '1',
        firstName: 'John',
        lastName: 'ppoo'
      })
    } catch (error) {
      expect(error.message).toBe('Validation Error: {lastName: stringTooLong}')
    }

    await Persons.insertOne({
      _id: '1',
      firstName: 'John',
      lastName: 'Doe'
    })

    const person = await Persons.findOne('1')

    expect(person.firstName).toBe('John')

    expect(person.title).toBeUndefined()
  })
})
