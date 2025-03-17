import cleanKey from './cleanKey'
import {test, expect} from 'vitest'

test('autoconvert value', async () => {
  const schema = {
    number: {
      type: Number,
    },
  }
  const cleaned = await cleanKey(schema, 'number', '12')
  expect(cleaned).toBe(12)
})

test('deep clean fields', async () => {
  const tag = {
    name: {
      type: String,
    },
  }
  const car = {
    brand: {
      type: String,
    },
    tags: {
      type: [tag],
    },
  }
  const schema = {
    name: {
      type: String,
    },
    car: {
      type: car,
    },
  }

  expect(await cleanKey(schema, 'car.tags', {name: 12})).toEqual([{name: '12'}])
  expect(await cleanKey(schema, 'car.brand', 'Nissan')).toBe('Nissan')
  expect(await cleanKey(schema, 'car.tags', 'Nice')).toEqual(['Nice'])
  expect(await cleanKey(schema, 'car.tags.$.name', 12)).toBe('12')
  expect(await cleanKey(schema, 'car.tags.100.name', 12)).toBe('12')
})

test('filters keys not in schema', async () => {
  const schema = {
    services: {
      type: 'blackbox',
    },
  }

  expect(await cleanKey(schema, 'person.name', 'Nicolás')).toBe(undefined)
})

test('dont filter keys not in schema if specified', async () => {
  const schema = {
    services: {
      type: 'blackbox',
    },
  }

  expect(await cleanKey(schema, 'person.name', 'Nicolás', {filter: false})).toBe('Nicolás')
})

test('clean blackbox key', async () => {
  const schema = {
    services: {
      type: 'blackbox',
    },
  }

  expect(await cleanKey(schema, 'services.password', '123456')).toBe('123456')
})

test('clean key with custom clean function', async () => {
  let calls = 0
  const schema = {
    services: {
      type: {
        password: {type: String},
        __clean({password}) {
          calls++
          return {password: password.slice(0, 2)}
        },
      },
    },
  }

  expect(await cleanKey(schema, 'services', {password: '123456'})).toEqual({password: '12'})
  expect(calls).toBe(1)
})

test('should handle $ correctly', async () => {
  const Email = {
    address: {
      type: String,
    },
    verified: {
      type: Boolean,
    },
  }
  const user = {
    emails: {
      type: [Email],
    },
  }

  const cleaned = await cleanKey(user, 'emails.$.verified', 'true')
  expect(cleaned).toEqual(true)
})

test('should inject doc on cleanKey', async () => {
  const item = {data: 20}

  const user = {
    data: {
      type: String,
      clean(value, {doc}) {
        expect(doc).toEqual(item)
        return value
      },
    },
  }

  const cleaned = await cleanKey(user, 'data', item.data, {forceDoc: item})
  expect(cleaned).toBe('20')

  expect.assertions(2)
})
