import {createResolver, createModelResolver} from './index'
import {Schema, schemaWithName} from '@orion-js/schema'
import {it, expect} from 'vitest'

it('should return a function with a resolver id', () => {
  const resolver = createResolver({
    params: {
      value: {
        type: 'number',
      },
    },
    returns: String,
    async resolve(params) {
      const {value} = params
      return String(value)
    },
  })

  expect(typeof resolver).toBe('object')
  expect(typeof resolver.resolve).toBe('function')
  expect(typeof resolver.execute).toBe('function')
  expect(typeof resolver.resolverId).toBe('string')
})

it('shoud pass types to params and returns', async () => {
  const params = schemaWithName('ExampleParams', {
    name: {type: 'string'},
  })
  const returns = schemaWithName('ExampleReturns', {
    name: {type: 'string'},
  })

  createResolver({
    params,
    returns,
    resolve: async params => {
      return {
        name: `Name: ${params.name}`,
      }
    },
  })
})

it('should execute the function', async () => {
  const resolver = createResolver({
    params: {
      value: {
        type: Number,
      },
    },
    returns: Number,
    async resolve({value}: {value: number}) {
      return value * 2
    },
  })

  const result = await resolver.execute({params: {value: 2}})
  expect(result).toBe(4)
})

it('should create typed resolvers', async () => {
  interface TestResolverParams {
    value: number
  }

  const resolver = createResolver({
    params: {
      value: {
        type: Number,
      },
    },
    returns: Number,
    resolve: async (params: TestResolverParams) => {
      return params.value * 2
    },
  })

  const result1 = await resolver.resolve({
    value: 2,
  })

  const result2 = await resolver.execute({
    params: {value: 2},
  })

  expect(result1).toBe(4)
  expect(result2).toBe(4)
})

it('should create typed model resolvers', async () => {
  const resolver = createModelResolver({
    returns: Number,
    resolve: async (model: {value: number}, params: {times: number}) => model.value * params.times,
  })

  await resolver.resolve({value: 1}, {times: 2})

  await resolver.execute({
    parent: {value: 1},
    params: {times: 2},
  })
})

it('should accept a model as returns', async () => {
  const aModel = {
    __isModel: true,
    name: 'Returns',
    getSchema(): Schema {
      return {
        value: {
          type: 'string',
        },
      }
    },
  }

  class Returns {
    value = 1

    static getModel() {
      return aModel
    }
  }

  const resolver = createResolver({
    returns: Returns,
    resolve: async (): Promise<Returns> => {
      return {value: 2}
    },
  })

  const result = await resolver.resolve()
  expect(result.value).toBe('2')
})

it('should not clean params when no params are passed', async () => {
  const resolver = createResolver({
    resolve: async ({title}: {title: string}) => {
      return `${title}`
    },
  })

  const result = await resolver.execute({params: {title: 'test'}})

  expect(result).toBe('test')
})

it('should allow calling resolver.resolve', async () => {
  const resolver = createResolver({
    params: {
      title: {
        type: String,
      },
    },
    resolve: async ({title}) => {
      return `${title}`
    },
  })

  const modelResolver = createModelResolver({
    params: {
      title: {
        type: String,
      },
    },
    resolve: async ({title}) => {
      return `${title}`
    },
  })

  expect(await resolver.resolve({title: 'test'})).toBe('test')
  expect(await modelResolver.resolve({title: 'test'})).toBe('test')
})

it('only allow compliant resolve function', async () => {
  createResolver({
    resolve: async () => {
      return 'hello'
    },
  })

  createModelResolver({
    resolve: async () => {
      return 'hello'
    },
  })
})

it('should allow to pass a fourth param with the info', async () => {
  const resolver = createResolver({
    resolve: async (_params: any, _viewer: any, info: {test: any}) => {
      expect(info.test).toBe(1)
      return 'hello'
    },
  })

  const modelResolver = createModelResolver({
    resolve: async (_parent: any, _params: any, _viewer: any, info: {test: any}) => {
      expect(info.test).toBe(1)
      return 'hello'
    },
  })

  await resolver.execute({
    params: {},
    viewer: {},
    info: {
      test: 1,
    },
  })

  await modelResolver.execute({
    parent: {},
    params: {},
    viewer: {},
    info: {
      test: 1,
    },
  })

  expect.assertions(2)
})
