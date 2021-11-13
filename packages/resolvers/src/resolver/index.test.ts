import {resolver as createResolver, modelResolver as createModelResolver} from './index'
import {Schema} from '@orion-js/schema'
import {sleep} from '@orion-js/helpers'

it('should return a function with a resolver id', () => {
  const resolver = createResolver({
    params: {},
    returns: String,
    async resolve() {}
  })

  expect(typeof resolver).toBe('object')
  expect(typeof resolver.resolve).toBe('function')
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
    async resolve({value}: {value: number}) {
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
    cache: 100,
    async resolve(params: {value: number}) {
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

  await sleep(100)
})

it('should create typed resolvers', async () => {
  interface TestResolverParams {
    value: number
  }

  const resolver = createResolver({
    params: {
      value: {
        type: Number
      }
    },
    returns: Number,
    resolve: async (params: TestResolverParams) => {
      return params.value * 2
    }
  })

  const result1 = await resolver.resolve({
    value: 2
  })

  const result2 = await resolver.execute({
    params: {value: 2}
  })

  expect(result1).toBe(4)
  expect(result2).toBe(4)
})

it('should create typed model resolvers', async () => {
  const resolver = createModelResolver({
    returns: Number,
    resolve: async function (model: {value: number}, params: {times: number}) {
      return model.value * params.times
    }
  })

  await resolver.resolve({value: 1}, {times: 2})
  const inModel = resolver.modelResolve

  await resolver.execute({
    parent: {value: 1},
    params: {times: 2}
  })
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
    },
    initItem(item: any) {
      return item
    }
  }

  class TypedParams {
    value: number = 1

    static getModel() {
      return aModel
    }
  }

  const resolver = createModelResolver({
    params: TypedParams,
    returns: Number,
    resolve: async function (item: any, params: TypedParams) {
      return params.value * 2
    }
  })

  const inModel = resolver.modelResolve
})

it('should accept a model as returns', async () => {
  const aModel = {
    __isModel: true,
    name: 'Returns',
    getSchema(): Schema {
      return {
        value: {
          type: 'string'
        }
      }
    },
    initItem(item: any) {
      return item
    }
  }

  class Returns {
    value: number = 1

    static getModel() {
      return aModel
    }
  }

  const resolver = createResolver({
    returns: Returns,
    resolve: async (): Promise<Returns> => {
      return {value: 2}
    }
  })

  const result = await resolver.resolve()
  expect(result.value).toBe(2)
})

it('should correctly clean params when no params are passed', async () => {
  const resolver = createResolver({
    resolve: async ({title}: {title: string}) => {
      return `${title}`
    }
  })

  expect(await resolver.execute({params: {title: 'test'}})).toBe('test')
})

it('should allow calling resolver.resolve', async () => {
  const resolver = createResolver({
    resolve: async ({title}: {title: string}) => {
      return `${title}`
    }
  })

  const modelResolver = createModelResolver({
    resolve: async ({title}: {title: string}) => {
      return `${title}`
    }
  })

  expect(await resolver.resolve({title: 'test'})).toBe('test')
  expect(await modelResolver.resolve({title: 'test'})).toBe('test')
})

it('only allow compliant resolve function', async () => {
  const resolver = createResolver({
    resolve: async () => {
      return 'hello'
    }
  })

  const modelResolver = createModelResolver({
    resolve: async () => {
      return 'hello'
    }
  })
})
