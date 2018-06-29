import validateKey from './validateKey'
import Errors from './Errors'

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
  const tag = {
    name: {
      type: String
    }
  }
  const car = {
    brand: {
      type: String
    },
    tags: {
      type: [tag]
    }
  }
  const schema = {
    name: {
      type: String
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
  const schema = {
    services: {
      type: 'blackbox'
    }
  }

  expect(await validateKey(schema, 'person.name', 'Nicolás')).toBeNull()
})

test('dont filter keys not in schema if specified', async () => {
  const schema = {
    services: {
      type: 'blackbox'
    }
  }

  expect(await validateKey(schema, 'person.name', 'Nicolás', {filter: true})).toBe(
    Errors.NOT_IN_SCHEMA
  )
})
