import hashObject from './hashObject'

it('should create a string hash of an object', async () => {
  const object = {
    hello: 'world',
    date: new Date(),
    subObject: {
      name: 'Nicolás'
    }
  }

  const hash = hashObject(object)

  expect(typeof hash).toBe('string')
})

it('object with different key orders should return same hash', async () => {
  const object1 = {
    one: '1',
    two: '2'
  }

  const object2 = {
    two: '2',
    one: '1'
  }

  const hash1 = hashObject(object1)
  const hash2 = hashObject(object2)

  expect(hash1).toBe(hash2)
})
