import {generateId, sleep} from '@orion-js/helpers'
import {defineJob, jobsHistoryRepo, scheduleJob, startWorkers} from '.'
import {describe, it, expect} from 'vitest'

describe('Stale Jobs Management', () => {
  it('Should spawn a new worker when a job is stale and kill the stale worker after it ends', async () => {
    const jobName1 = `job1${generateId()}`
    const job1 = defineJob({
      type: 'event',
      async resolve(_, context) {
        if (context.tries === 1) {
          await sleep(50)
        }
        return {status: 'finished'}
      },
    })

    const jobName2 = `job2${generateId()}`
    const job2 = defineJob({
      type: 'event',
      async resolve() {
        return {status: 'finished'}
      },
    })

    const instance = startWorkers({
      jobs: {[jobName1]: job1, [jobName2]: job2},
      workersCount: 10,
      pollInterval: 5,
      cooldownPeriod: 5,
      defaultLockTime: 20,
    })

    await scheduleJob({name: jobName1})
    await scheduleJob({name: jobName2})

    await sleep(500)
    await instance.stop()

    const executions1 = await jobsHistoryRepo.getExecutions(jobName1)
    expect(executions1.length).toBe(2)

    const executions2 = await jobsHistoryRepo.getExecutions(jobName2)
    expect(executions2.length).toBe(1)
  })

  it('Should run stale jobs in the lowest priority', async () => {
    const executions = []
    const priotities = []
    const jobName1 = `job1${generateId()}`
    const job1 = defineJob({
      type: 'event',
      async resolve(_, context) {
        executions.push('stale')
        priotities.push(context.record.priority)
        if (context.tries === 1) {
          await sleep(100)
        }
      },
    })

    const jobName2 = `job2${generateId()}`
    const job2 = defineJob({
      type: 'event',
      async resolve() {
        executions.push('success')
      },
    })

    const instance = startWorkers({
      jobs: {[jobName1]: job1, [jobName2]: job2},
      workersCount: 1,
      pollInterval: 5,
      cooldownPeriod: 5,
      defaultLockTime: 10,
    })

    await scheduleJob({name: jobName1})
    await scheduleJob({name: jobName2})

    await sleep(150)
    await instance.stop()

    expect(priotities).toEqual([100, 0])
    expect(executions).toEqual(['stale', 'success', 'stale'])
  })

  it('Should revert to original priority when execution was stale on recurrent jobs', async () => {
    const priotities = []
    let didStale = false
    const jobName = `job${generateId()}`

    const job = defineJob({
      type: 'recurrent',
      runEvery: 5,
      async resolve(_, context) {
        priotities.push(context.record.priority)
        if (!didStale) {
          didStale = true
          await sleep(100)
        }
      },
    })

    const instance = startWorkers({
      jobs: {[jobName]: job},
      workersCount: 1,
      pollInterval: 5,
      cooldownPeriod: 5,
      defaultLockTime: 10,
    })

    await sleep(150)
    await instance.stop()

    const [first, second, ...others] = priotities

    expect(first).toBe(100)
    expect(second).toBe(0)
    expect(others.length).toBeGreaterThan(0)
    expect(others).toEqual(Array(others.length).fill(100))
  })
})
