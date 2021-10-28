import createResolver from './index'

it('should return a function with a resolver id', () => {
  const resolver = createResolver({
    params: {},
    returns: String,
    async resolve(params, viewer) {}
  })

  expect(typeof resolver.execute).toBe('function')
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

  const result = await resolver.execute({params: {value: 2}})
  expect(result).toBe(4)
})

it('should get from cache', async () => {
  let index = 1
  const resolver = createResolver({
    params: {
      value: {
        type: Number
      }
    },
    returns: Number,
    cache: 1000,
    async resolve() {
      return index++
    }
  })

  const result1 = await resolver.execute({params: {value: 1}}) // 1
  expect(result1).toBe(1)

  const result2 = await resolver.execute({params: {value: 1}}) // 1
  expect(result2).toBe(1)

  const result3 = await resolver.execute({params: {value: 2}}) // 2
  expect(result3).toBe(2)

  const result4 = await resolver.execute({params: {value: 2}}) // 2
  expect(result4).toBe(2)

  const result5 = await resolver.execute({params: {value: 3}}) // 3
  expect(result5).toBe(3)
})
