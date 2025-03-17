import {Schema, InferSchemaType} from '.'
import {clean, createEnum} from '..'
import {test, expect} from 'vitest'

test('check ts types for schema', async () => {
  const schema: Schema = {
    numbers: {
      type: [Number],
    },
    string: {
      type: 'string',
      optional: true,
      private: true,
    },
  }

  const result = await clean(schema, {numbers: ['2'], string: 1})
  expect(result).toEqual({numbers: [2], string: '1'})
})

// only ts check

type A = InferSchemaType<'string'>
const _a: A = 'a string'

type StringArray = InferSchemaType<['string']>
const _stringArray: StringArray = ['a string']
// const notPasses: StringArray = 'asdf'

type B = InferSchemaType<String>
const _b: B = 'a '

type C = InferSchemaType<Date>
const _c: C = new Date()

type D = InferSchemaType<Number>
const _d: D = 1

type E = InferSchemaType<Boolean>
const _e: E = true

const schema = {
  name: {type: String},
  age: {type: Number},
  email: {type: 'email'},
  isAdmin: {type: 'boolean', optional: true},
  createdAt: {type: Date},
  tags: {type: ['string']},
  gender: {
    type: createEnum('GenderEnum', ['male', 'female']),
  },
  address: {
    type: {
      street: {type: String},
      city: {type: String},
      state: {type: String},
      zip: {type: String, optional: true},
    },
  },
} as const

type Person = InferSchemaType<typeof schema>

const _person: Person = {
  name: 'John Doe',
  age: 30,
  email: 'john.doe@example.com',
  gender: 'male',
  // isAdmin: false,
  createdAt: new Date(),
  tags: ['tag1', 'tag2d'],
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    // zip: '12345',
  },
}

_person.address.city = 'asdf'
