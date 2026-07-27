import {expect, it} from 'bun:test'
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
        async resolve(params, context) {
          contexts.push({params, context})
        },
      }),
    },
    events: {
      pulse: {
        connectionString: mongo.getUri('echoes'),
        consumerGroup: 'billing',
        changeStreams: 'disabled',
        pollIntervalMs: 10,
        maxPoolSize: 2,
        lockTimeoutMs: 1000,
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
