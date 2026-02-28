import {generateId} from '@orion-js/helpers'
import {ValidationError} from '@orion-js/schema'
import {getModelForClass, Prop, TypedSchema} from '@orion-js/typed-model'
import {createCollection} from '.'

describe('Collections with typed model', () => {
  const _resolve = async (person: Person, {title}: {title: string}, _viewer?: any) => {
    return `${title} ${person.firstName} ${person.lastName}`
  }

  @TypedSchema()
  class Person {
    @Prop({type: String})
    _id: string

    @Prop({type: String})
    firstName: string

    @Prop({type: String, max: 10})
    lastName: string
  }

  it('Should throw a validation error', async () => {
    const Persons = createCollection<Person>({
      name: generateId(),
      schema: getModelForClass(Person),
    })
    expect.assertions(1)

    try {
      await Persons.insertOne({firstName: 'John', lastName: 'Really long last name'})
    } catch (e) {
      const validationError = e as ValidationError
      expect(validationError.validationErrors).toEqual({
        lastName: 'stringTooLong',
      })
    }
  })

  it('Should allow passing _id on insert', async () => {
    @TypedSchema()
    class PersonOptionalId {
      @Prop({type: String})
      _id: string

      @Prop({type: String})
      firstName: string

      @Prop({type: String, optional: true})
      lastName?: string
    }

    const Persons = createCollection<PersonOptionalId>({
      name: generateId(),
      schema: PersonOptionalId,
    })

    await Persons.insertOne({
      _id: '1',
      firstName: 'John',
    })

    const person = await Persons.findOne('1')

    expect(person.firstName).toBe('John')
  })
})
