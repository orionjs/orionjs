import 'reflect-metadata'
import {sleep} from '@orion-js/helpers'
import {defineJob, scheduleJob, startWorkers} from '.'

describe('Event tests', () => {
  it('Should run an event job', async () => {
    let count = 0
    const job3 = defineJob({
      type: 'event',
      async resolve(params) {
        count += params.add
      }
    })

    const instance = startWorkers({
      jobs: {job3},
      workersCount: 1,
      pollInterval: 10,
      cooldownPeriod: 10,
      logLevel: 'info'
    })

    expect(count).toBe(0)

    await scheduleJob({
      name: 'job3',
      params: {add: 5},
      runIn: 1
    })

    await scheduleJob({
      name: 'job3',
      params: {add: 25},
      runIn: 1
    })

    await sleep(100)
    await instance.stop()

    expect(count).toBe(30)
  })
})
