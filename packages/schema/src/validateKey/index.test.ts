import validateKey from './index'
import Errors from '../Errors'
import {Schema} from '..'

test('autoconvert value', async () => {
  const schema = {
    number: {
      type: Number
    }
  }
  const errors = await validateKey(schema, 'number', '12')
  expect(errors).toEqual(Errors.NOT_A_NUMBER)
})

test('deep validate fields', async () => {
  const tag: Schema = {
    name: {
      type: 'string'
    }
  }
  const car: Schema = {
    brand: {
      type: 'string'
    },
    tags: {
      type: [tag]
    }
  }
  const schema: Schema = {
    name: {
      type: 'string'
    },
    car: {
      type: car
    }
  }

  expect(await validateKey(schema, 'car.brand', 'Nissan')).toBeNull()
  expect(await validateKey(schema, 'car.tags', 'Nice')).toBe(Errors.NOT_AN_ARRAY)
  expect(await validateKey(schema, 'name', null)).toBe(Errors.REQUIRED)
  expect(await validateKey(schema, 'car', null)).toBe(Errors.REQUIRED)
  expect(await validateKey(schema, 'car.tags.$.name', 12)).toBe(Errors.NOT_A_STRING)
  expect(await validateKey(schema, 'car.tags.100.name', 12)).toBe(Errors.NOT_A_STRING)
})

test('filters keys not in schema', async () => {
  const schema: Schema = {
    services: {
      type: 'blackbox'
    }
  }

  expect(await validateKey(schema, 'person.name', 'Nicolás')).toBeNull()
})

test('dont filter keys not in schema if specified', async () => {
  const schema: Schema = {
    services: {
      type: 'blackbox'
    }
  }

  expect(await validateKey(schema, 'person.name', 'Nicolás', {filter: true})).toBe(
    Errors.NOT_IN_SCHEMA
  )
})

test('should handle $ correctly', async () => {
  const Email: Schema = {
    address: {
      type: String
    },
    verified: {
      type: Boolean
    }
  }
  const user: Schema = {
    emails: {
      type: [Email]
    }
  }

  expect(await validateKey(user, 'emails.$.verified', true)).toBeNull()
})

test('validate blackbox child', async () => {
  const schema: Schema = {
    _id: {type: 'ID'},
    services: {type: 'blackbox'}
  }

  expect(await validateKey(schema, 'services.phoneVerification.tries', 1)).toBeNull()
})
