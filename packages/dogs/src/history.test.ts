import {sleep, generateId} from '@orion-js/helpers'
import {defineJob, jobsHistoryRepo, scheduleJob, startWorkers} from '.'

describe('Test Jobs History', () => {
  it('Should save success history types', async () => {
    const jobId = generateId()
    const job = defineJob({
      type: 'event',
      async resolve() {
        await sleep(50)
        return {
          number: 1
        }
      }
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 1,
      pollInterval: 10
    })

    await scheduleJob({
      name: jobId,
      runIn: 1,
      params: {id: 2}
    })

    await sleep(100)
    await instance.stop()

    const executions = await jobsHistoryRepo.getExecutions(jobId)

    expect(executions.length).toBe(1)

    const execution = executions[0]
    expect(execution.duration).toBeGreaterThan(49)
    expect(execution).toEqual({
      _id: expect.any(String),
      executionId: expect.any(String),
      jobName: jobId,
      isRecurrent: false,
      priority: 1,
      tries: 1,
      startedAt: expect.any(Date),
      endedAt: expect.any(Date),
      duration: expect.any(Number),
      expiresAt: expect.any(Date),
      status: 'success',
      errorMessage: null,
      params: {id: 2},
      result: {number: 1}
    })
  })

  it('Should save error history types', async () => {
    const jobId = generateId()
    const job = defineJob({
      type: 'event',
      async resolve() {
        throw new Error('Hello')
      }
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 1,
      pollInterval: 10,
      logLevel: 'none'
    })

    await scheduleJob({
      name: jobId,
      runIn: 1,
      params: {id: 4}
    })

    await sleep(100)
    await instance.stop()

    const executions = await jobsHistoryRepo.getExecutions(jobId)

    expect(executions.length).toBe(1)

    const execution = executions[0]
    expect(execution).toEqual({
      _id: expect.any(String),
      executionId: expect.any(String),
      jobName: jobId,
      isRecurrent: false,
      priority: 1,
      tries: 1,
      startedAt: expect.any(Date),
      endedAt: expect.any(Date),
      duration: expect.any(Number),
      expiresAt: expect.any(Date),
      status: 'error',
      errorMessage: 'Hello',
      params: {id: 4},
      result: null
    })
  })

  it('Should save stale history types', async () => {
    const jobId = generateId()
    const job = defineJob({
      type: 'event',
      async resolve() {
        await sleep(100)
        return {status: 'ok'}
      }
    })

    const instance = startWorkers({
      jobs: {[jobId]: job},
      workersCount: 1,
      pollInterval: 10,
      lockTime: 10,
      logLevel: 'none'
    })

    await scheduleJob({
      name: jobId,
      runIn: 1
    })

    await sleep(150)
    await instance.stop()

    const executions = await jobsHistoryRepo.getExecutions(jobId)

    expect(executions.length).toBe(2)

    const execution1 = executions[1]
    expect(execution1.duration).toBeGreaterThanOrEqual(10)
    expect(execution1.duration).toBeLessThan(100)
    expect(execution1).toEqual({
      _id: expect.any(String),
      executionId: expect.any(String),
      jobName: jobId,
      isRecurrent: false,
      priority: 1,
      tries: 1,
      startedAt: expect.any(Date),
      endedAt: expect.any(Date),
      duration: expect.any(Number),
      expiresAt: expect.any(Date),
      status: 'stale',
      errorMessage: null,
      params: null,
      result: null
    })

    const execution2 = executions[0]
    expect(execution2.duration).toBeGreaterThanOrEqual(100)
    expect(execution2).toEqual({
      _id: expect.any(String),
      executionId: expect.any(String),
      jobName: jobId,
      isRecurrent: false,
      priority: 1,
      tries: 1,
      startedAt: expect.any(Date),
      endedAt: expect.any(Date),
      duration: expect.any(Number),
      expiresAt: expect.any(Date),
      status: 'success',
      errorMessage: null,
      params: null,
      result: {status: 'ok'}
    })
  })
})
