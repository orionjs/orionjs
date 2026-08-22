import {describe, expect, it, mock} from 'bun:test'
import {sleep} from '@orion-js/helpers'
import {getInstance} from '@orion-js/services'
import {CANDIDATE_JOB_ACQUISITION_HINT, INITIAL_JOB_ACQUISITION_HINT} from '../repos/JobsRepo'
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

function probeWithEqualTimes() {
  return mock(async () => 1)
}

function workersConfig() {
  return {
    jobs: {
      firstJob: {type: 'event', resolve: async () => {}},
      secondJob: {type: 'event', resolve: async () => {}},
    },
    workersCount: 2,
    pollInterval: 1000,
    defaultLockTime: 1000,
  } as any
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
      getJobAcquisitionExecutionTime: probeWithEqualTimes(),
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
      getJobAcquisitionExecutionTime: probeWithEqualTimes(),
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
      getJobAcquisitionExecutionTime: probeWithEqualTimes(),
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
      getJobAcquisitionExecutionTime: probeWithEqualTimes(),
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

  it('should select the startup winner immediately and require two later wins to switch', async () => {
    const workerService = new WorkerService() as any
    const config = workersConfig()
    let candidateIsFaster = true
    const getJobAcquisitionExecutionTime = mock(async (_jobNames, hint) => {
      if (candidateIsFaster) {
        return hint === CANDIDATE_JOB_ACQUISITION_HINT ? 2 : 10
      }
      return hint === INITIAL_JOB_ACQUISITION_HINT ? 2 : 10
    })
    workerService.jobsRepo = {getJobAcquisitionExecutionTime}
    const instance = workerService.createWorkersInstanceDefinition(config) as any

    await workerService.runJobAcquisitionHintProbe(config, instance)
    expect(instance.jobAcquisitionHint).toBe(CANDIDATE_JOB_ACQUISITION_HINT)

    candidateIsFaster = false
    await workerService.runJobAcquisitionHintProbe(config, instance)
    expect(instance.jobAcquisitionHint).toBe(CANDIDATE_JOB_ACQUISITION_HINT)

    await workerService.runJobAcquisitionHintProbe(config, instance)
    expect(instance.jobAcquisitionHint).toBe(INITIAL_JOB_ACQUISITION_HINT)

    const hints = getJobAcquisitionExecutionTime.mock.calls.map(call => call[1])
    expect(hints.slice(0, 6)).toEqual([
      INITIAL_JOB_ACQUISITION_HINT,
      CANDIDATE_JOB_ACQUISITION_HINT,
      INITIAL_JOB_ACQUISITION_HINT,
      CANDIDATE_JOB_ACQUISITION_HINT,
      INITIAL_JOB_ACQUISITION_HINT,
      CANDIDATE_JOB_ACQUISITION_HINT,
    ])
    expect(hints.slice(6, 12)).toEqual([
      CANDIDATE_JOB_ACQUISITION_HINT,
      INITIAL_JOB_ACQUISITION_HINT,
      CANDIDATE_JOB_ACQUISITION_HINT,
      INITIAL_JOB_ACQUISITION_HINT,
      CANDIDATE_JOB_ACQUISITION_HINT,
      INITIAL_JOB_ACQUISITION_HINT,
    ])
    expect(getJobAcquisitionExecutionTime.mock.calls[0][0]).toEqual(['firstJob', 'secondJob'])
  })

  it('should keep the current hint and reset the win streak when a probe fails', async () => {
    const workerService = new WorkerService() as any
    const config = workersConfig()
    workerService.jobsRepo = {
      getJobAcquisitionExecutionTime: mock(async () => {
        throw new Error('explain timed out')
      }),
    }
    const instance = workerService.createWorkersInstanceDefinition(config) as any
    instance.hasCompletedInitialJobAcquisitionHintProbe = true
    instance.pendingJobAcquisitionHint = CANDIDATE_JOB_ACQUISITION_HINT
    instance.pendingJobAcquisitionHintWins = 1

    await workerService.runJobAcquisitionHintProbe(config, instance)

    expect(instance.jobAcquisitionHint).toBe(INITIAL_JOB_ACQUISITION_HINT)
    expect(instance.pendingJobAcquisitionHint).toBeUndefined()
    expect(instance.pendingJobAcquisitionHintWins).toBe(0)
  })

  it('should keep the current hint and reset the win streak when medians tie', async () => {
    const workerService = new WorkerService() as any
    const config = workersConfig()
    workerService.jobsRepo = {getJobAcquisitionExecutionTime: probeWithEqualTimes()}
    const instance = workerService.createWorkersInstanceDefinition(config) as any
    instance.hasCompletedInitialJobAcquisitionHintProbe = true
    instance.pendingJobAcquisitionHint = CANDIDATE_JOB_ACQUISITION_HINT
    instance.pendingJobAcquisitionHintWins = 1

    await workerService.runJobAcquisitionHintProbe(config, instance)

    expect(instance.jobAcquisitionHint).toBe(INITIAL_JOB_ACQUISITION_HINT)
    expect(instance.pendingJobAcquisitionHint).toBeUndefined()
    expect(instance.pendingJobAcquisitionHintWins).toBe(0)
  })

  it('should skip probes when no jobs are configured', async () => {
    const workerService = new WorkerService() as any
    const getJobAcquisitionExecutionTime = probeWithEqualTimes()
    workerService.jobsRepo = {
      ensureMaxTriesReachedRetention: mock(async () => {}),
      getJobAcquisitionExecutionTime,
    }

    const instance = workerService.startWorkers({jobs: {}})
    await instance.stop()

    expect(getJobAcquisitionExecutionTime).not.toHaveBeenCalled()
  })

  it('should run periodic probes without overlap', async () => {
    const workerService = new WorkerService() as any
    workerService.jobAcquisitionHintProbeIntervalMs = 5
    let explainsInFlight = 0
    let maxExplainsInFlight = 0
    const getJobAcquisitionExecutionTime = mock(async () => {
      explainsInFlight++
      maxExplainsInFlight = Math.max(maxExplainsInFlight, explainsInFlight)
      await sleep(2)
      explainsInFlight--
      return 1
    })
    workerService.jobsRepo = {
      ensureMaxTriesReachedRetention: mock(async () => {}),
      getJobAndLock: mock(async () => undefined),
      getJobAcquisitionExecutionTime,
    }

    const instance = workerService.startWorkers({
      jobs: {testJob: {type: 'event', resolve: async () => {}}} as any,
      pollInterval: 1000,
    })
    await waitUntil(() => getJobAcquisitionExecutionTime.mock.calls.length >= 12)
    await instance.stop()

    expect(maxExplainsInFlight).toBe(1)
    expect(getJobAcquisitionExecutionTime).toHaveBeenCalledTimes(12)
  })

  it('should wait for an in-flight probe on stop and skip its remaining explains', async () => {
    const workerService = new WorkerService() as any
    let resolveExplain!: (executionTimeMillis: number) => void
    const getJobAcquisitionExecutionTime = mock(
      async () =>
        await new Promise<number>(resolve => {
          resolveExplain = resolve
        }),
    )
    workerService.jobsRepo = {
      ensureMaxTriesReachedRetention: mock(async () => {}),
      getJobAndLock: mock(async () => undefined),
      getJobAcquisitionExecutionTime,
    }

    const instance = workerService.startWorkers({
      jobs: {testJob: {type: 'event', resolve: async () => {}}} as any,
      pollInterval: 1000,
    })
    await waitUntil(() => getJobAcquisitionExecutionTime.mock.calls.length === 1)

    let didStop = false
    const stopPromise = instance.stop().then(() => {
      didStop = true
    })
    await sleep(5)
    expect(didStop).toBe(false)

    resolveExplain(1)
    await stopPromise

    expect(getJobAcquisitionExecutionTime).toHaveBeenCalledTimes(1)
  })
})
