import {ValidationError} from '@orion-js/schema'
import createCollection from '.'
import {TypedModel, Prop, getModelForClass, ResolverProp} from '@orion-js/typed-model'
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

  it('Should pass the update method to the items', async () => {
    const Persons = createCollection<Person>({
      name: generateId(),
      model: getModelForClass(Person)
    })

    await Persons.insertOne({
      firstName: 'John',
      lastName: 'Doe'
    })

    const person = await Persons.findOne({})
    await person.update({$set: {firstName: 'Alice'}})

    expect(person.firstName).toBe('Alice')

    const updatedPerson = await Persons.findOne({})
    expect(updatedPerson.firstName).toBe('Alice')
    const title = await person.title({title: 'Ms.'})

    expect(title).toBe('Ms. Alice Doe')
  })
})
