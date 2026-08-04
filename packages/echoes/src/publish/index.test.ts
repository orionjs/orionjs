import {expect, it} from 'bun:test'
import config from '../config'
import deserialize from '../echo/deserialize'
import KafkaManager from '../startService/KafkaManager'
import type {PublishOptions} from '../types'
import publish from './index'

it('publish does not mutate its options or params before sending to Kafka', async () => {
  const order = {
    _id: 'order-id',
    update() {},
    nested: {
      website() {},
    },
  }
  const params = {order}
  const options: PublishOptions<typeof params> = {
    topic: 'justo.order.update',
    params,
    acks: 1,
    timeout: 5000,
  }
  const original = {
    params: options.params,
    order: params.order,
    update: order.update,
    nested: order.nested,
    website: order.nested.website,
  }
  let sent: any
  const manager = new KafkaManager({client: {brokers: ['localhost:9092']}})
  ;(manager as any).producer = {
    async send(value: any) {
      sent = value
      return {sent: true}
    },
  }
  ;(manager as any).producerConnected = true

  const previousEventBus = config.eventBus
  config.eventBus = {
    publish: value => manager.publish(value),
  } as any

  try {
    await publish(options)
  } finally {
    config.eventBus = previousEventBus
  }

  expect(options.params).toBe(original.params)
  expect(options.params.order).toBe(original.order)
  expect(order.update).toBe(original.update)
  expect(order.nested).toBe(original.nested)
  expect(order.nested.website).toBe(original.website)
  expect(options).toEqual({
    topic: 'justo.order.update',
    params,
    acks: 1,
    timeout: 5000,
  })

  const result = deserialize(sent.messages[0].value)
  expect(result.params.order._id).toBe('order-id')
  expect(result.params.order.update).toBeUndefined()
  expect(result.params.order.nested.website).toBeUndefined()
})
