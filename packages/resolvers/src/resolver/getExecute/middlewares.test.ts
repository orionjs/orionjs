import {modelResolver, resolver} from '..'
import {createResolverMiddleware} from '../../createResolverMiddleware'
import {it, expect} from 'vitest'

it('should call middlewares in the correct order', async () => {
  const order: (string | number)[] = []

  const middleware1 = createResolverMiddleware(async (_, next) => {
    order.push(1)
    const result = await next()
    order.push(result)
    order.push(3)
    return 'middleware1'
  })

  const middleware2 = createResolverMiddleware(async (_, next) => {
    order.push(2)
    const result = await next()
    order.push(result)
    order.push(4)
    return 'middleware2'
  })

  const testResolver = resolver({
    params: {},
    middlewares: [middleware1, middleware2],
    async resolve() {
      order.push(5)
      return 'resolve'
    },
  })

  const finalResult = await testResolver.resolve()

  expect(finalResult).toEqual('middleware1')

  expect(order).toEqual([1, 2, 5, 'resolve', 4, 'middleware2', 3])
})

it('should let you throw an error inside a middleware', async () => {
  const middleware1 = createResolverMiddleware(async () => {
    throw new Error('middleware1')
  })

  const testResolver = resolver({
    params: {},
    middlewares: [middleware1],
    async resolve() {
      return 'resolve'
    },
  })

  await expect(testResolver.resolve()).rejects.toEqual(new Error('middleware1'))
})

it('should work with model resolvers and modify its params', async () => {
  const middleware1 = createResolverMiddleware(async (executeOptions, next) => {
    executeOptions.params.number = 2
    executeOptions.parent.text = 'middleware'
    const result = await next()
    return result
  })

  const testResolver = modelResolver({
    params: {number: {type: Number}},
    middlewares: [middleware1],
    async resolve(model, params) {
      return `${model.text} ${params.number}`
    },
  })

  const finalResult = await testResolver.execute({
    params: {number: 1},
    parent: {text: 'test'},
  })

  expect(finalResult).toEqual('middleware 2')
})
