import {describe, expect, it, mock} from 'bun:test'
import {getEventListeners} from 'node:events'
import {sleep} from '@orion-js/helpers'
import {JobToRun} from '../types/Worker'
import {WorkerService} from './WorkerService'

const STOP_DEADLINE_MS = 100

async function waitUntil(check: () => boolean, timeout = 2000) {
  const startedAt = Date.now()
  while (!check()) {
    if (Date.now() - startedAt > timeout) throw new Error('Timed out waiting for condition')
    await sleep(1)
  }
}

function job(executionId: string): JobToRun {
  return {
    jobId: `job-${executionId}`,
    executionId,
    lockId: executionId,
    name: 'testJob',
    type: 'event',
    params: {},
    tries: 1,
    lockTime: 1000,
    priority: 100,
  }
}

function idleConfig(overrides: Record<string, unknown> = {}) {
  return {
    jobs: {testJob: {type: 'event', resolve: async () => {}}},
    workersCount: 1,
    pollInterval: 0,
    defaultLockTime: 1000,
    nPartitions: 3,
    ...overrides,
  } as any
}

function startLoop(workerService: any, config: any) {
  const instance = workerService.createWorkersInstanceDefinition(config)
  instance.schedulerPromise = workerService.runSchedulerLoop(config, instance)
  return instance
}

function abortListenerCount(instance: any) {
  return getEventListeners(instance.stopController.signal, 'abort').length
}

async function expectSchedulerToStopPromptly(instance: any) {
  const startedAt = Date.now()
  void instance.stop()
  await instance.schedulerPromise
  expect(Date.now() - startedAt).toBeLessThan(STOP_DEADLINE_MS)
}

describe('WorkerService stop-interruptible waits', () => {
  it('should leave no stop listeners registered across idle scheduler iterations', async () => {
    const workerService = new WorkerService() as any
    const inputIterations = 600
    const actualListenerCountsBetweenWaits: number[] = []
    const actualListenerCountsDuringFilter: number[] = []
    let instance: any
    workerService.jobsRepo = {
      getJobAndLock: mock(async () => {
        actualListenerCountsBetweenWaits.push(abortListenerCount(instance))
        return null
      }),
    }
    const config = idleConfig({
      getJobsFilter: async () => {
        actualListenerCountsDuringFilter.push(abortListenerCount(instance))
        return {}
      },
    })

    instance = startLoop(workerService, config)
    await waitUntil(() => actualListenerCountsBetweenWaits.length >= inputIterations)
    await instance.stop()

    expect(new Set(actualListenerCountsBetweenWaits)).toEqual(new Set([0]))
    expect(new Set(actualListenerCountsDuringFilter)).toEqual(new Set([1]))
    expect(abortListenerCount(instance)).toBe(0)
  })

  it('should not retain claimed job names while the scheduler keeps running', async () => {
    const workerService = new WorkerService() as any
    const inputIterations = 300
    const claimedJobNames: WeakRef<string[]>[] = []
    // A plain function: mock() would retain every argument in mock.calls
    workerService.jobsRepo = {
      getJobAndLock: async (jobNames: string[]) => {
        claimedJobNames.push(new WeakRef(jobNames))
        return null
      },
    }

    const instance = startLoop(workerService, idleConfig())
    await waitUntil(() => claimedJobNames.length >= inputIterations)
    await sleep(0)
    Bun.gc(true)
    const actualRetained = claimedJobNames
      .slice(0, inputIterations - 10)
      .filter(ref => ref.deref() !== undefined).length
    await instance.stop()

    expect(actualRetained).toBe(0)
  })

  it('should interrupt the poll wait as soon as stop is called', async () => {
    const workerService = new WorkerService() as any
    const getJobAndLock = mock(async () => null)
    workerService.jobsRepo = {getJobAndLock}

    const instance = startLoop(workerService, idleConfig({pollInterval: 60_000, nPartitions: 1}))
    await waitUntil(() => getJobAndLock.mock.calls.length === 1)
    await sleep(5)

    await expectSchedulerToStopPromptly(instance)
    expect(abortListenerCount(instance)).toBe(0)
  })

  it('should interrupt the capacity wait as soon as stop is called', async () => {
    const workerService = new WorkerService() as any
    let finishExecution!: () => void
    workerService.jobsRepo = {getJobAndLock: mock(async () => job('long-execution'))}
    workerService.executor = {
      executeJob: mock(
        async () =>
          await new Promise<void>(resolve => {
            finishExecution = resolve
          }),
      ),
    }

    const instance = startLoop(workerService, idleConfig({pollInterval: 60_000}))
    await waitUntil(() => instance.runningExecutions === 1)
    await sleep(5)

    await expectSchedulerToStopPromptly(instance)
    expect(abortListenerCount(instance)).toBe(0)
    finishExecution()
    await instance.stop()
  })

  it('should interrupt a pending jobs-filter check as soon as stop is called', async () => {
    const workerService = new WorkerService() as any
    const getJobAndLock = mock(async () => null)
    workerService.jobsRepo = {getJobAndLock}
    let filterCalls = 0
    const config = idleConfig({
      pollInterval: 60_000,
      getJobsFilter: () => {
        filterCalls++
        return new Promise(() => {})
      },
    })

    const instance = startLoop(workerService, config)
    await waitUntil(() => filterCalls === 1)

    await expectSchedulerToStopPromptly(instance)
    expect(getJobAndLock).not.toHaveBeenCalled()
    expect(abortListenerCount(instance)).toBe(0)
  })
})
