import {ModelResolverFunction} from './types'
import createResolver from './index'
import {Schema} from '@orion-js/schema'

it('should return a function with a resolver id', () => {
  const resolver = createResolver({
    params: {},
    returns: String,
    async resolve(params, viewer) {}
  })

  expect(typeof resolver).toBe('object')
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

it('should create typed resolvers', async () => {
  const resolve = async (params: {value: number}) => {
    return params.value * 2
  }
  const resolver = createResolver<typeof resolve>({
    params: {
      value: {
        type: Number
      }
    },
    returns: Number,
    resolve
  })

  const result = await resolver.execute({params: {value: 2}})
  expect(result).toBe(4)
})

it('should create typed model resolvers', async () => {
  const resolver = createResolver({
    params: {
      value: {
        type: Number
      }
    },
    returns: Number,
    resolve: async function (model, params?: {value: number}) {
      return model.value * 2
    }
  })

  const inModel = resolver.resolve as unknown as ModelResolverFunction<typeof resolver.resolve>

  const inModelResult = await inModel({value: 2})

  /**
   * We are testing the typescript removes one argument on the resolve function.
   */
  expect(inModelResult).toBe(4)
})

it('should accept a model as params', async () => {
  const aModel = {
    __isModel: true,
    name: 'ResolverParams',
    getSchema(): Schema {
      return {
        value: {
          type: 'string'
        }
      }
    }
  }
  const resolver = createResolver({
    params: aModel,
    returns: Number,
    resolve: async function (params: {value: number}) {
      return params.value * 2
    }
  })

  const inModel = resolver.resolve as unknown as ModelResolverFunction<typeof resolver.resolve>

  const inModelResult = await inModel({value: 2})

  /**
   * We are testing the typescript removes one argument on the resolve function.
   */
  expect(inModelResult).toBe(4)
})
