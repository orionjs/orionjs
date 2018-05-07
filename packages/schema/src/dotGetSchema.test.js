import dotGetSchema from './dotGetSchema'

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

test('handle deep schemas', async () => {
  const value = dotGetSchema(schema, 'car.brand')
  expect(value).toBe(schema.car.type.brand)
})

test('handle invalid paths', async () => {
  const value = dotGetSchema(schema, 'car.brand.name')
  expect(value).toBeNull()
})

test('finds array first item when $ is passed', async () => {
  const value = dotGetSchema(schema, 'car.tags.$.name')
  expect(value).toBe(tag.name)
})

test('replaces numbers to $', async () => {
  expect(dotGetSchema(schema, 'car.tags.0.name')).toBe(tag.name)
  expect(dotGetSchema(schema, 'car.tags.1123.name')).toBe(tag.name)
})
