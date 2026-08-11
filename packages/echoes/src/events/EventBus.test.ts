import {describe, expect, it} from 'bun:test'
import {createEchoEvent} from '../echo'
import type {EchoesEventTransportName, PublishOptions} from '../types'
import {resolveEventsConfig} from './createEventBus'
import EventBus from './EventBus'
import type {EventTransport, EventTransportStartOptions} from './EventTransport'

class FakeTransport implements EventTransport {
  readonly published: PublishOptions[] = []
  startOptions?: EventTransportStartOptions
  closed = false

  constructor(readonly name: EchoesEventTransportName) {}

  async start(options: EventTransportStartOptions) {
    this.startOptions = options
  }

  async publish(options: PublishOptions) {
    this.published.push(options)
    return {transport: this.name}
  }

  async close() {
    this.closed = true
  }

  async emit(topic: string, params: unknown) {
    await this.startOptions.onEvent({
      id: `${this.name}-event`,
      topic,
      data: {params},
      transport: this.name,
      createdAt: new Date(),
      attempt: 1,
    })
  }
}

describe('Echoes EventBus', () => {
  it('consumes from Kafka and Pulse while publishing to Kafka only', async () => {
    const contexts: Array<{params: unknown; transport: EchoesEventTransportName}> = []
    const kafka = new FakeTransport('kafka')
    const pulse = new FakeTransport('pulse')
    const eventBus = new EventBus({
      echoes: {
        'order.created': createEchoEvent({
          attemptsBeforeDeadLetter: 4,
          ordered: false,
          async resolve(params, context) {
            contexts.push({params, transport: context.transport})
          },
        }),
      },
      transports: {kafka, pulse},
      consumeFrom: ['kafka', 'pulse'],
      publishTo: 'kafka',
    })

    await eventBus.start()

    expect(kafka.startOptions.consume).toBe(true)
    expect(kafka.startOptions.publish).toBe(true)
    expect(pulse.startOptions.consume).toBe(true)
    expect(pulse.startOptions.publish).toBe(false)
    expect(pulse.startOptions.subscriptions).toEqual([
      {topic: 'order.created', attemptsBeforeDeadLetter: 4, ordered: false},
    ])

    await kafka.emit('order.created', {orderId: 'kafka'})
    await pulse.emit('order.created', {orderId: 'pulse'})
    await eventBus.publish({topic: 'order.created', params: {orderId: 'published'}})

    expect(contexts).toEqual([
      {params: {orderId: 'kafka'}, transport: 'kafka'},
      {params: {orderId: 'pulse'}, transport: 'pulse'},
    ])
    expect(kafka.published).toHaveLength(1)
    expect(pulse.published).toHaveLength(0)

    await eventBus.close()
    expect(kafka.closed).toBe(true)
    expect(pulse.closed).toBe(true)
  })

  it('switches publishing to Pulse without changing dual listeners', async () => {
    const kafka = new FakeTransport('kafka')
    const pulse = new FakeTransport('pulse')
    const eventBus = new EventBus({
      echoes: {},
      transports: {kafka, pulse},
      consumeFrom: ['kafka', 'pulse'],
      publishTo: 'pulse',
    })

    await eventBus.start()
    const result = await eventBus.publish({topic: 'order.created', params: {orderId: '1'}})

    expect(result).toEqual({transport: 'pulse'})
    expect(kafka.published).toHaveLength(0)
    expect(pulse.published).toHaveLength(1)
    expect(kafka.startOptions.publish).toBe(false)
    expect(pulse.startOptions.publish).toBe(true)

    await eventBus.close()
  })

  it('preserves the legacy onMessage entrypoint for Kafka events', async () => {
    const kafka = new FakeTransport('kafka')
    const receivedMessages: unknown[] = []
    const legacyMessage = {topic: 'order.created', marker: 'legacy'}
    const eventBus = new EventBus({
      echoes: {
        'order.created': {
          type: 'event',
          async resolve() {
            throw new Error('legacy Kafka events should use onMessage')
          },
          async onMessage(message) {
            receivedMessages.push(message)
          },
          async onRequest() {},
        },
      },
      transports: {kafka},
      consumeFrom: ['kafka'],
      publishTo: 'kafka',
    })

    await eventBus.start()
    await kafka.startOptions.onEvent({
      id: 'kafka-event',
      topic: 'order.created',
      data: {params: {}},
      transport: 'kafka',
      createdAt: new Date(),
      attempt: 1,
      context: legacyMessage,
    })

    expect(receivedMessages).toEqual([legacyMessage])
    await eventBus.close()
  })

  it('rejects a selected transport that is not configured', async () => {
    const eventBus = new EventBus({
      echoes: {},
      transports: {kafka: new FakeTransport('kafka')},
      consumeFrom: ['kafka', 'pulse'],
      publishTo: 'kafka',
    })

    await expect(eventBus.start()).rejects.toThrow(
      'Echoes event transport "pulse" is selected but not configured',
    )
  })
})

describe('Echoes event configuration', () => {
  it('keeps the legacy Kafka configuration as the default', () => {
    const resolved = resolveEventsConfig({
      client: {
        clientId: 'billing',
        brokers: ['kafka:9092'],
      },
      producer: {},
      consumer: {groupId: 'billing'},
      echoes: {},
    })

    expect(resolved.consumeFrom).toEqual(['kafka'])
    expect(resolved.publishTo).toBe('kafka')
    expect(resolved.kafka.consumer.groupId).toBe('billing')
  })

  it('allows legacy Kafka fields and Pulse to be enabled incrementally', () => {
    const resolved = resolveEventsConfig({
      client: {
        clientId: 'billing',
        brokers: ['kafka:9092'],
      },
      consumer: {groupId: 'billing'},
      producer: {},
      events: {
        pulse: {
          connectionString: 'mongodb://localhost/echoes',
          consumerGroup: 'billing',
        },
        consumeFrom: ['kafka', 'pulse'],
        publishTo: 'kafka',
      },
      echoes: {},
    })

    expect(resolved.consumeFrom).toEqual(['kafka', 'pulse'])
    expect(resolved.publishTo).toBe('kafka')
    expect(resolved.kafka).toBeDefined()
    expect(resolved.pulse.consumerGroup).toBe('billing')
  })
})
