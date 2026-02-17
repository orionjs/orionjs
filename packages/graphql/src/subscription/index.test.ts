import {describe, expect, it, vi} from 'vitest'
import {setPubsub} from '../pubsub'
import createSubscription from './index'

describe('subscription', () => {
  it('should not subscribe to pubsub channel when canSubscribe returns false', async () => {
    const pubsub = {
      publish: vi.fn(async () => {}),
      asyncIterator: vi.fn(() => ({})),
    }
    setPubsub(pubsub as any)

    const testSubscription = createSubscription({
      returns: 'string',
      async canSubscribe() {
        return false
      },
    })
    testSubscription.name = 'testSub'

    const iterator = (await testSubscription.subscribe({}, {})) as AsyncIterator<any>
    const nextResult = await iterator.next()

    expect(nextResult.done).toBe(true)
    expect(pubsub.asyncIterator).not.toHaveBeenCalled()
  })
})
