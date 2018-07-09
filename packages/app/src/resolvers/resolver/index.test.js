import createResolver from './index'

it('should return a function with a resolver id', () => {
  const resolver = createResolver({
    params: {},
    returns: String,
    async resolve(params, viewer) {}
  })

  expect(typeof resolver).toBe('function')
  expect(typeof resolver.resolverId).toBe('string')
})

it('should execute the function', async () => {
  const resolver = createResolver({
    params: {
      value: {
        type: Number
      }
    },
    returns: Number,
    async resolve({value}, viewer) {
      return value * 2
    }
  })

  const result = await resolver({value: 2})
  expect(result).toBe(4)
})

it('should get from cache and invalidate', async () => {
  let index = 1
  const resolver = createResolver({
    params: {
      value: {
        type: Number
      }
    },
    returns: Number,
    cache: 1000,
    async resolve({value}, viewer) {
      return index++
    }
  })

  const result1 = await resolver({value: 1})
  expect(result1).toBe(1)

  const result2 = await resolver({value: 1})
  expect(result2).toBe(1)

  const result3 = await resolver({value: 2})
  expect(result3).toBe(2)

  const result4 = await resolver({value: 2})
  expect(result4).toBe(2)

  resolver.invalidateCache({value: 2})

  const result5 = await resolver({value: 2})
  expect(result5).toBe(3)

  const result6 = await resolver({value: 1})
  expect(result6).toBe(1)

  expect(index).toBe(4)
})
