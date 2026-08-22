import {describe, expect, it, mock} from 'bun:test'
import {sleep} from '@orion-js/helpers'
import {getInstance} from '@orion-js/services'
import {JobToRun} from '../types/Worker'
import {WorkerService} from './WorkerService'

async function waitUntil(check: () => boolean, timeout = 200) {
  const startedAt = Date.now()
  while (!check()) {
    if (Date.now() - startedAt > timeout) throw new Error('Timed out waiting for condition')
    await sleep(2)
  }
}

function job(executionId: string, name = 'testJob'): JobToRun {
  return {
    jobId: `job-${executionId}`,
    executionId,
    lockId: executionId,
    name,
    type: 'event',
    params: {},
    tries: 1,
    lockTime: 1000,
    priority: 100,
  }
}

describe('WorkerService', () => {
  it('should expose startWorkers', () => {
    const workerService = getInstance(WorkerService)
    expect(workerService.startWorkers).toBeDefined()
  })

  it('should reject invalid maxTriesReached retention values', () => {
    const workerService = getInstance(WorkerService)

    expect(() =>
      workerService.startWorkers({
        jobs: {},
        maxTriesReachedRetentionMs: -1,
      }),
    ).toThrow('maxTriesReachedRetentionMs must be null, zero, or a positive number')
  })

  it('should use one polling loop regardless of configured concurrency', async () => {
    const workerService = new WorkerService() as any
    const getJobAndLock = mock(async () => undefined)
    workerService.jobsRepo = {
      ensureMaxTriesReachedRetention: mock(async () => {}),
      getJobAndLock,
    }

    const instance = workerService.startWorkers({
      jobs: {testJob: {type: 'event', resolve: async () => {}}} as any,
      workersCount: 20,
      pollInterval: 20,
    })

    await sleep(55)
    await instance.stop()

    expect(getJobAndLock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(getJobAndLock.mock.calls.length).toBeLessThanOrEqual(4)
    expect(instance.runningExecutions).toBe(0)
    expect('workers' in instance).toBe(false)
  })

  it('should fill available capacity and refill it immediately after an execution finishes', async () => {
    const workerService = new WorkerService() as any
    const pendingJobs = [job('execution-1'), job('execution-2'), job('execution-3')]
    const executionResolvers = new Map<string, () => void>()

    workerService.jobsRepo = {
      ensureMaxTriesReachedRetention: mock(async () => {}),
      getJobAndLock: mock(async () => pendingJobs.shift()),
    }
    workerService.executor = {
      executeJob: mock(async (_config, jobToRun: JobToRun) => {
        await new Promise<void>(resolve => executionResolvers.set(jobToRun.executionId, resolve))
      }),
    }

    const instance = workerService.startWorkers({
      jobs: {testJob: {type: 'event', resolve: async () => {}}} as any,
      workersCount: 2,
      pollInterval: 1000,
    })

    await waitUntil(() => executionResolvers.size === 2)
    expect(instance.runningExecutions).toBe(2)

    executionResolvers.get('execution-1')()
    await waitUntil(() => executionResolvers.has('execution-3'))
    expect(instance.runningExecutions).toBe(2)

    executionResolvers.get('execution-2')()
    executionResolvers.get('execution-3')()
    await instance.stop()
    expect(instance.runningExecutions).toBe(0)
  })

  it('should release capacity when an execution becomes stale without waiting for it to settle', async () => {
    const workerService = new WorkerService() as any
    const pendingJobs = [job('stale-execution'), job('replacement-execution')]
    const startedExecutions: string[] = []

    workerService.jobsRepo = {
      ensureMaxTriesReachedRetention: mock(async () => {}),
      getJobAndLock: mock(async () => pendingJobs.shift()),
    }
    workerService.executor = {
      executeJob: mock(async (_config, jobToRun: JobToRun, onStale: () => void) => {
        startedExecutions.push(jobToRun.executionId)
        if (jobToRun.executionId === 'stale-execution') {
          await sleep(5)
          onStale()
          await new Promise<void>(() => {})
        }
      }),
    }

    const instance = workerService.startWorkers({
      jobs: {testJob: {type: 'event', resolve: async () => {}}} as any,
      workersCount: 1,
      pollInterval: 1000,
    })

    await waitUntil(() => startedExecutions.includes('replacement-execution'))
    await instance.stop()

    expect(startedExecutions).toEqual(['stale-execution', 'replacement-execution'])
    expect(instance.runningExecutions).toBe(0)
  })

  it('should execute a job from an acquisition that was already in flight when stopped', async () => {
    const workerService = new WorkerService() as any
    let resolveAcquisition!: (job: JobToRun) => void
    const executeJob = mock(async () => {})
    const getJobAndLock = mock(
      async () =>
        await new Promise<JobToRun>(resolve => {
          resolveAcquisition = resolve
        }),
    )

    workerService.jobsRepo = {
      ensureMaxTriesReachedRetention: mock(async () => {}),
      getJobAndLock,
    }
    workerService.executor = {executeJob}

    const instance = workerService.startWorkers({
      jobs: {testJob: {type: 'event', resolve: async () => {}}} as any,
      workersCount: 1,
      pollInterval: 1000,
    })

    await waitUntil(() => getJobAndLock.mock.calls.length === 1)
    const stopPromise = instance.stop()
    resolveAcquisition(job('committed-execution'))
    await stopPromise

    expect(executeJob).toHaveBeenCalledTimes(1)
    expect(instance.runningExecutions).toBe(0)
  })
})
