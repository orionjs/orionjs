import {generateId, sleep} from '@orion-js/helpers'
import {defineJob, jobsHistoryRepo, scheduleJob, startWorkers} from '.'
import {describe, it, expect} from 'vitest'

describe('Per-job lockTime', () => {
  it('Should use job-specific lockTime when larger than default', async () => {
    const jobId = generateId()
    let staleCount = 0

    // Job has lockTime of 200ms, which is larger than defaultLockTime of 10ms
    // The job takes 50ms, so it should NOT become stale
    const job = defineJob({
      type: 'event',
      lockTime: 200,
      async resolve() {
        await sleep(50)
      },
      async onStale() {
        staleCount++
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 2,
      pollInterval: 5,
      cooldownPeriod: 5,
      defaultLockTime: 10, // Very short default, but job overrides it
    })

    await scheduleJob({name: jobId})
    await sleep(150)
    await instance.stop()

    // Job should NOT have become stale because its lockTime (200ms) > execution time (50ms)
    expect(staleCount).toBe(0)

    const executions = await jobsHistoryRepo.getExecutions(jobId)
    expect(executions.length).toBe(1)
    expect(executions[0].status).toBe('success')
  })

  it('Should use job-specific lockTime when shorter than default', async () => {
    const jobId = generateId()
    let staleCount = 0

    // Job has lockTime of 10ms, which is shorter than defaultLockTime of 200ms
    // The job takes 50ms, so it SHOULD become stale
    const job = defineJob({
      type: 'event',
      lockTime: 10,
      async resolve(_, context) {
        if (context.tries === 1) {
          await sleep(50)
        }
      },
      async onStale() {
        staleCount++
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 2,
      pollInterval: 5,
      cooldownPeriod: 5,
      defaultLockTime: 200, // Long default, but job uses shorter lockTime
    })

    await scheduleJob({name: jobId})
    await sleep(150)
    await instance.stop()

    // Job SHOULD have become stale because its lockTime (10ms) < execution time (50ms)
    expect(staleCount).toBe(1)

    const executions = await jobsHistoryRepo.getExecutions(jobId)
    expect(executions.length).toBe(2) // One stale, one success
  })

  it('Should use defaultLockTime when job has no custom lockTime', async () => {
    const jobId = generateId()
    let staleCount = 0

    // Job has no lockTime, so it uses defaultLockTime of 10ms
    // The job takes 50ms on first try, so it SHOULD become stale
    const job = defineJob({
      type: 'event',
      async resolve(_, context) {
        if (context.tries === 1) {
          await sleep(50)
        }
      },
      async onStale() {
        staleCount++
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 2,
      pollInterval: 5,
      cooldownPeriod: 5,
      defaultLockTime: 10,
    })

    await scheduleJob({name: jobId})
    await sleep(150)
    await instance.stop()

    // Job SHOULD have become stale because defaultLockTime (10ms) < execution time (50ms)
    expect(staleCount).toBe(1)

    const executions = await jobsHistoryRepo.getExecutions(jobId)
    expect(executions.length).toBe(2) // One stale, one success
  })
})
