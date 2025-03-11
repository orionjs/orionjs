import {sleep} from '@orion-js/helpers'
import {defineJob, startWorkers} from '.'
import {describe, it, expect} from 'vitest'

describe('Recurrent tests', () => {
  it('Should run a recurrent job', async () => {
    let ran = false
    const job1 = defineJob({
      type: 'recurrent',
      runEvery: 10,
      async resolve() {
        ran = true
      },
    })

    const instance = startWorkers({
      jobs: {job1},
      workersCount: 3,
      pollInterval: 10,
      cooldownPeriod: 10,
    })

    await sleep(500)
    await instance.stop()

    expect(ran).toBe(true)
  })

  it('Should run a recurrent job 3 times', async () => {
    let count = 0
    const job2 = defineJob({
      type: 'recurrent',
      runEvery: 1,
      async resolve() {
        count++
      },
    })

    const instance = startWorkers({
      jobs: {job2},
      workersCount: 3,
      pollInterval: 1,
      cooldownPeriod: 1,
    })

    await sleep(200)
    await instance.stop()

    expect(count).toBeGreaterThanOrEqual(3)
  })
})
