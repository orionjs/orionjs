import cleanKey from './cleanKey'

test('autoconvert value', async () => {
  const schema = {
    number: {
      type: Number
    }
  }
  const cleaned = await cleanKey(schema, 'number', '12')
  expect(cleaned).toBe(12)
})

test('deep clean fields', async () => {
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

  expect(await cleanKey(schema, 'car.brand', 'Nissan')).toBe('Nissan')
  expect(await cleanKey(schema, 'car.tags', 'Nice')).toEqual(['Nice'])
  expect(await cleanKey(schema, 'car.tags.$.name', 12)).toBe('12')
  expect(await cleanKey(schema, 'car.tags.100.name', 12)).toBe('12')
})
