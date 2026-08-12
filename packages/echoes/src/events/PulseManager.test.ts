import {expect, it} from 'bun:test'
import {MongoClient} from 'mongodb'
import {MongoMemoryServer} from 'mongodb-memory-server'
import {createEchoEvent} from '../echo'
import publish from '../publish'
import startService, {stopService} from '../startService'
import type {EchoesOptions} from '../types'

async function waitFor(assertion: () => void, timeoutMs = 5000) {
  const startedAt = Date.now()
  while (true) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) throw error
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }
}

it('publishes and consumes Echoes events through Pulse', async () => {
  const mongo = await MongoMemoryServer.create()
  const contexts: any[] = []
  const options: EchoesOptions = {
    echoes: {
      'order.created': createEchoEvent({
        ordered: true,
        configVersion: 2,
        async resolve(params, context) {
          contexts.push({params, context})
        },
      }),
      'invoice.created': createEchoEvent({
        async resolve() {},
      }),
    },
    events: {
      pulse: {
        connectionString: mongo.getUri('echoes'),
        consumerGroup: 'billing',
        pollIntervalMs: 10,
        maxPoolSize: 2,
        lockTimeoutMs: 1000,
        discoveryLockTimeoutMs: 500,
        subscription: {
          offsetReset: 'latest',
        },
      },
      consumeFrom: ['pulse'],
      publishTo: 'pulse',
    },
  }

  try {
    await startService(options)
    const mongoClient = new MongoClient(mongo.getUri('echoes'))
    await mongoClient.connect()
    const subscriptions = await mongoClient
      .db('echoes')
      .collection('orionjs.pulse.subscriptions')
      .find({}, {projection: {_id: 0, topic: 1, ordered: 1, configVersion: 1}})
      .sort({topic: 1})
      .toArray()
    await mongoClient.close()

    expect(subscriptions).toEqual([
      {topic: 'invoice.created', ordered: false, configVersion: 0},
      {topic: 'order.created', ordered: true, configVersion: 2},
    ])

    const published = await publish({
      topic: 'order.created',
      params: {orderId: '123'},
    })

    await waitFor(() => expect(contexts).toHaveLength(1))

    expect(contexts[0].params).toEqual({orderId: '123'})
    expect(contexts[0].context.transport).toBe('pulse')
    expect(contexts[0].context.eventId).toBe(published.id)
    expect(contexts[0].context.attempt).toBe(1)
  } finally {
    await stopService()
    await mongo.stop()
  }
}, 20_000)

it('does not allow Change Streams through the Echoes Pulse configuration', async () => {
  await expect(
    startService({
      echoes: {},
      events: {
        pulse: {
          connectionString: 'mongodb://localhost/pulse',
          consumerGroup: 'removed-change-streams-group',
          changeStreams: 'auto',
        },
        consumeFrom: ['pulse'],
        publishTo: 'pulse',
      },
    } as any),
  ).rejects.toThrow('changeStreams is no longer supported')
})
