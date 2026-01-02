import {sleep, generateId} from '@orion-js/helpers'
import {defineJob, scheduleJob, startWorkers} from '.'
import {describe, it, expect} from 'vitest'

describe('Event tests', () => {
  it('Should run an event job', async () => {
    let count = 0
    const job3 = defineJob({
      type: 'event',
      async resolve(params) {
        count += params.add
      },
    })

    const instance = startWorkers({
      jobs: {job3},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
    })

    expect(count).toBe(0)

    await scheduleJob({
      name: 'job3',
      params: {add: 5},
      runIn: 50,
    })

    await scheduleJob({
      name: 'job3',
      params: {add: 25},
      runIn: 1,
    })

    await sleep(300)

    await instance.stop()

    expect(count).toBeGreaterThanOrEqual(30)
  })

  it('Should run retry the job 3 times', async () => {
    let passes = false
    const job4 = defineJob({
      type: 'event',
      async resolve(_, context) {
        if (context.tries < 3) {
          throw new Error('Failed')
        }
        passes = true
      },
      async onError() {
        return {
          action: 'retry',
          runIn: 1,
        }
      },
    })

    const instance = startWorkers({
      jobs: {job4},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
    })

    expect(passes).toBe(false)

    await scheduleJob({
      name: 'job4',
      runIn: 1,
    })

    await sleep(100)
    await instance.stop()

    expect(passes).toBe(true)
  })

  it('Should throw locktime error and test extendLockTime', async () => {
    const jobId = generateId()
    let ranCount = 0
    let staleCount = 0
    const job = defineJob({
      type: 'event',
      async resolve(_, context) {
        if (context.tries === 2) {
          context.extendLockTime(10000)
        }

        await sleep(100)
        ranCount++
      },
      async onStale(_, context) {
        expect(context.tries).toBe(1)
        staleCount++
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 2,
      pollInterval: 10,
      cooldownPeriod: 10,
      defaultLockTime: 10,
    })

    await scheduleJob({
      name: jobId,
      runIn: 1,
    })

    await sleep(300)
    await instance.stop()

    expect(staleCount).toBe(1)
    expect(ranCount).toBe(2)
  })

  it('Should only schedule one job with uniqueIdentifier', async () => {
    const jobId = generateId()
    let ranCount = 0
    const job = defineJob({
      type: 'event',
      async resolve() {
        ranCount++
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 5,
      pollInterval: 50,
      cooldownPeriod: 50,
    })

    await Promise.all([
      scheduleJob({
        name: jobId,
        runIn: 1,
        uniqueIdentifier: 'unique',
      }),
      scheduleJob({
        name: jobId,
        runIn: 1,
        uniqueIdentifier: 'unique',
      }),
    ])
    await sleep(50)
    await instance.stop()

    expect(ranCount).toBe(1)
  })
})
