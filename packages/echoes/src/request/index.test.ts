import {expect, it} from 'bun:test'
import config from '../config'
import deserialize from '../echo/deserialize'
import request from './index'

it('request does not mutate params before sending them over HTTP', async () => {
  const order = {
    _id: 'order-id',
    update() {},
    website() {},
    items() {},
  }
  const params = {order}
  const methods = {
    update: order.update,
    website: order.website,
    items: order.items,
  }
  let serializedParams: string
  const previousRequests = config.requests
  config.requests = {
    key: 'secret',
    async makeRequest(options) {
      serializedParams = (options.data.body as any).serializedParams
      return {
        statusCode: 200,
        data: {result: '({ok:true})'},
      }
    },
  }

  try {
    const result = await request({
      method: 'orders.get',
      service: 'https://orders.example.com',
      params,
    })
    expect(result).toEqual({ok: true})
  } finally {
    config.requests = previousRequests
  }

  expect(order.update).toBe(methods.update)
  expect(order.website).toBe(methods.website)
  expect(order.items).toBe(methods.items)
  expect(params.order).toBe(order)

  const sentParams = deserialize(serializedParams)
  expect(sentParams.order._id).toBe('order-id')
  expect(sentParams.order.update).toBeUndefined()
  expect(sentParams.order.website).toBeUndefined()
  expect(sentParams.order.items).toBeUndefined()
})
