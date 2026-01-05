import {sleep, generateId} from '@orion-js/helpers'
import {defineJob, jobsHistoryRepo, scheduleJob, startWorkers} from '.'
import {describe, it, expect} from 'vitest'

describe('Test Jobs History', () => {
  it('Should save success history types', async () => {
    const jobId = generateId()
    const job = defineJob({
      type: 'event',
      async resolve() {
        await sleep(10)
        return {
          number: 1,
        }
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 10,
      pollInterval: 10,
      maxTries: 10,
      onMaxTriesReached: async () => {},
    })

    await scheduleJob({
      name: jobId,
      runIn: 0,
      params: {id: 2},
    })

    await sleep(200)
    await instance.stop()
    await sleep(100)

    const executions = await jobsHistoryRepo.getExecutions(jobId)

    expect(executions.length).toBe(1)

    const execution = executions[0]
    expect(execution.duration).toBeGreaterThanOrEqual(7)
    expect(execution).toEqual({
      _id: expect.any(String),
      jobId: expect.any(String),
      executionId: expect.any(String),
      jobName: jobId,
      type: 'event',
      priority: 100,
      tries: 1,
      startedAt: expect.any(Date),
      endedAt: expect.any(Date),
      duration: expect.any(Number),
      expiresAt: expect.any(Date),
      status: 'success',
      errorMessage: null,
      params: {id: 2},
      result: {number: 1},
    })
  })

  it('Should save error history types', async () => {
    const jobId = generateId()
    const job = defineJob({
      type: 'event',
      async resolve() {
        throw new Error('Hello')
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 1,
      pollInterval: 10,
      maxTries: 10,
      onMaxTriesReached: async () => {},
    })

    await scheduleJob({
      name: jobId,
      runIn: 1,
      params: {id: 4},
    })

    await sleep(100)
    await instance.stop()

    const executions = await jobsHistoryRepo.getExecutions(jobId)

    expect(executions.length).toBe(1)

    const execution = executions[0]
    expect(execution).toEqual({
      _id: expect.any(String),
      jobId: expect.any(String),
      executionId: expect.any(String),
      jobName: jobId,
      type: 'event',
      priority: 100,
      tries: 1,
      startedAt: expect.any(Date),
      endedAt: expect.any(Date),
      duration: expect.any(Number),
      expiresAt: expect.any(Date),
      status: 'error',
      errorMessage: 'Hello',
      params: {id: 4},
      result: null,
    })
  })

  it('Should save stale history types', async () => {
    const jobId = generateId()
    const job = defineJob({
      type: 'event',
      async resolve(_, context) {
        if (context.tries === 1) {
          await sleep(100)
        }
        return {status: 'ok'}
      },
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 3,
      pollInterval: 10,
      defaultLockTime: 10,
      maxTries: 10,
      onMaxTriesReached: async () => {},
    })

    await scheduleJob({
      name: jobId,
      runIn: 1,
    })

    await sleep(150)
    await instance.stop()

    const executions = await jobsHistoryRepo.getExecutions(jobId)

    expect(executions.length).toBe(2)

    const execution = executions.find(e => e.status === 'stale')
    expect(execution.duration).toBeGreaterThanOrEqual(100)
    expect(execution.duration).toBeLessThan(200)
    expect(execution).toEqual({
      _id: expect.any(String),
      jobId: expect.any(String),
      executionId: expect.any(String),
      jobName: jobId,
      type: 'event',
      priority: 100,
      tries: 1,
      startedAt: expect.any(Date),
      endedAt: expect.any(Date),
      duration: expect.any(Number),
      expiresAt: expect.any(Date),
      status: 'stale',
      errorMessage: null,
      params: null,
      result: {status: 'ok'},
    })
  })
})
