import {sleep} from '@orion-js/helpers'
import {logger} from '@orion-js/logger'
import {Inject, Service} from '@orion-js/services'
import {
  CANDIDATE_JOB_ACQUISITION_HINT,
  INITIAL_JOB_ACQUISITION_HINT,
  JobAcquisitionHint,
  JobsRepo,
} from '../repos/JobsRepo'
import {JobDefinitionWithName, JobsDefinition} from '../types/JobsDefinition'
import {DEFAULT_MAX_TRIES_REACHED_RETENTION_MS, StartWorkersConfig} from '../types/StartConfig'
import {JobToRun, WorkersInstance} from '../types/Worker'
import {ExecuteJobConfig, Executor} from './Executor'

interface TrackedExecution {
  job: JobToRun
  promise: Promise<void>
  capacityPromise: Promise<void>
  releaseCapacity: () => void
  status: 'running' | 'stale' | 'finished'
}

interface InternalWorkersInstance extends WorkersInstance {
  activeExecutions: Map<string, TrackedExecution>
  staleExecutions: Map<string, TrackedExecution>
  runningJobsByName: Map<string, number>
  jobAcquisitionHint: JobAcquisitionHint
  jobAcquisitionHintProbeCycle: number
  hasCompletedInitialJobAcquisitionHintProbe: boolean
  pendingJobAcquisitionHint?: JobAcquisitionHint
  pendingJobAcquisitionHintWins: number
  jobAcquisitionHintProbePromise: Promise<void>
  jobAcquisitionHintProbeTimer?: ReturnType<typeof setTimeout>
  cancelJobAcquisitionHintProbeWait?: () => void
  schedulerPromise: Promise<void>
  stopSignal: Promise<void>
  signalStop: () => void
  stopPromise?: Promise<void>
}

@Service()
export class WorkerService {
  private jobAcquisitionHintProbeIntervalMs = 30 * 60 * 1000

  @Inject(() => JobsRepo)
  private jobsRepo: JobsRepo

  @Inject(() => Executor)
  private executor: Executor

  getJobNames(jobs: JobsDefinition) {
    return Object.keys(jobs)
  }

  getJobs(jobs: JobsDefinition): JobDefinitionWithName[] {
    return Object.keys(jobs).map(name => {
      return {
        name,
        ...jobs[name],
      }
    })
  }

  getAvailableJobNames(
    config: StartWorkersConfig,
    workersInstance: InternalWorkersInstance,
    jobNames: string[],
  ) {
    return jobNames.filter(jobName => {
      const currentExecutions = workersInstance.runningJobsByName.get(jobName) || 0
      const job = config.jobs[jobName]
      const maxParallelExecutions =
        job.type === 'event'
          ? (job.maxParallelExecutionsPerServer ?? Number.POSITIVE_INFINITY)
          : Number.POSITIVE_INFINITY

      return currentExecutions < maxParallelExecutions
    })
  }

  reserveJobExecution(workersInstance: InternalWorkersInstance, jobName: string) {
    const currentExecutions = workersInstance.runningJobsByName.get(jobName) || 0
    workersInstance.runningJobsByName.set(jobName, currentExecutions + 1)
  }

  releaseJobExecution(workersInstance: InternalWorkersInstance, jobName: string) {
    const currentExecutions = workersInstance.runningJobsByName.get(jobName) || 0
    if (currentExecutions <= 1) {
      workersInstance.runningJobsByName.delete(jobName)
      return
    }

    workersInstance.runningJobsByName.set(jobName, currentExecutions - 1)
  }

  releaseExecutionCapacity(
    workersInstance: InternalWorkersInstance,
    execution: TrackedExecution,
    nextStatus: 'stale' | 'finished',
  ) {
    if (execution.status !== 'running') return

    execution.status = nextStatus
    workersInstance.activeExecutions.delete(execution.job.executionId)
    this.releaseJobExecution(workersInstance, execution.job.name)
    execution.releaseCapacity()

    if (nextStatus === 'stale') {
      workersInstance.staleExecutions.set(execution.job.executionId, execution)
    }
  }

  startExecution(
    config: ExecuteJobConfig,
    workersInstance: InternalWorkersInstance,
    jobToRun: JobToRun,
  ) {
    let releaseCapacity!: () => void
    const capacityPromise = new Promise<void>(resolve => {
      releaseCapacity = resolve
    })

    const execution: TrackedExecution = {
      job: jobToRun,
      promise: Promise.resolve(),
      capacityPromise,
      releaseCapacity,
      status: 'running',
    }

    this.reserveJobExecution(workersInstance, jobToRun.name)
    workersInstance.activeExecutions.set(jobToRun.executionId, execution)

    logger.debug(`Starting job execution "${jobToRun.executionId}"`, jobToRun)

    const executionPromise = this.executor.executeJob(config, jobToRun, () => {
      this.releaseExecutionCapacity(workersInstance, execution, 'stale')
    })
    execution.promise = executionPromise

    void executionPromise
      .catch(error => {
        logger.error(`Unhandled error executing job "${jobToRun.name}"`, {error})
      })
      .finally(() => {
        if (execution.status === 'running') {
          this.releaseExecutionCapacity(workersInstance, execution, 'finished')
        } else if (execution.status === 'stale') {
          workersInstance.staleExecutions.delete(jobToRun.executionId)
        }
      })
  }

  async waitForPollOrStop(config: StartWorkersConfig, workersInstance: InternalWorkersInstance) {
    await Promise.race([sleep(config.pollInterval), workersInstance.stopSignal])
  }

  async waitForCapacityOrStop(workersInstance: InternalWorkersInstance) {
    const capacityPromises = Array.from(
      workersInstance.activeExecutions.values(),
      execution => execution.capacityPromise,
    )

    if (capacityPromises.length === 0) return
    await Promise.race([...capacityPromises, workersInstance.stopSignal])
  }

  async runSchedulerLoop(config: StartWorkersConfig, workersInstance: InternalWorkersInstance) {
    const jobNames = this.getJobNames(config.jobs)
    const executeConfig: ExecuteJobConfig = {
      jobs: config.jobs,
      maxTries: config.maxTries,
      maxTriesReachedRetentionMs: config.maxTriesReachedRetentionMs,
      onMaxTriesReached: config.onMaxTriesReached,
    }

    logger.debug(`Running scheduler loop for jobs "${jobNames.join(', ')}"...`)

    while (workersInstance.running) {
      let didMiss = false
      let allJobNamesAtCapacity = false

      try {
        while (workersInstance.activeExecutions.size < config.workersCount) {
          const availableJobNames = this.getAvailableJobNames(config, workersInstance, jobNames)

          if (availableJobNames.length === 0) {
            allJobNamesAtCapacity = workersInstance.activeExecutions.size > 0
            break
          }

          const jobToRun = await this.jobsRepo.getJobAndLock(
            availableJobNames,
            config.defaultLockTime,
            workersInstance.jobAcquisitionHint,
          )

          if (!jobToRun) {
            logger.debug('No job to run')
            didMiss = true
            break
          }

          // An acquisition already in flight when stop() is called is considered committed.
          this.startExecution(executeConfig, workersInstance, jobToRun)
          if (!workersInstance.running) break
        }
      } catch (error) {
        logger.error('Error in job scheduler.', {error})
        didMiss = true
      }

      if (!workersInstance.running) return

      const concurrencyIsFull =
        workersInstance.activeExecutions.size >= config.workersCount &&
        workersInstance.activeExecutions.size > 0

      if (concurrencyIsFull || allJobNamesAtCapacity) {
        await this.waitForCapacityOrStop(workersInstance)
      } else if (didMiss || workersInstance.activeExecutions.size === 0) {
        await this.waitForPollOrStop(config, workersInstance)
      }
    }
  }

  getOtherJobAcquisitionHint(hint: JobAcquisitionHint): JobAcquisitionHint {
    return hint === INITIAL_JOB_ACQUISITION_HINT
      ? CANDIDATE_JOB_ACQUISITION_HINT
      : INITIAL_JOB_ACQUISITION_HINT
  }

  getMedian(values: number[]): number {
    const sortedValues = [...values].sort((left, right) => left - right)
    return sortedValues[Math.floor(sortedValues.length / 2)]
  }

  resetPendingJobAcquisitionHint(workersInstance: InternalWorkersInstance) {
    workersInstance.pendingJobAcquisitionHint = undefined
    workersInstance.pendingJobAcquisitionHintWins = 0
  }

  async runJobAcquisitionHintProbe(
    config: StartWorkersConfig,
    workersInstance: InternalWorkersInstance,
  ) {
    const jobNames = this.getJobNames(config.jobs)
    if (jobNames.length === 0 || !workersInstance.running) return

    const byHint: Record<JobAcquisitionHint, number[]> = {
      [INITIAL_JOB_ACQUISITION_HINT]: [],
      [CANDIDATE_JOB_ACQUISITION_HINT]: [],
    }
    const startsWithInitialHint = workersInstance.jobAcquisitionHintProbeCycle % 2 === 0
    const firstHint = startsWithInitialHint
      ? INITIAL_JOB_ACQUISITION_HINT
      : CANDIDATE_JOB_ACQUISITION_HINT
    const secondHint = this.getOtherJobAcquisitionHint(firstHint)
    workersInstance.jobAcquisitionHintProbeCycle++

    try {
      for (let sample = 0; sample < 3; sample++) {
        for (const hint of [firstHint, secondHint]) {
          if (!workersInstance.running) return
          const executionTimeMillis = await this.jobsRepo.getJobAcquisitionExecutionTime(
            jobNames,
            hint,
          )
          if (!workersInstance.running) return
          byHint[hint].push(executionTimeMillis)
        }
      }
    } catch (error) {
      this.resetPendingJobAcquisitionHint(workersInstance)
      if (workersInstance.running) {
        logger.warn('Job acquisition hint probe failed; keeping the current hint.', {error})
      }
      return
    }

    const currentHint = workersInstance.jobAcquisitionHint
    const otherHint = this.getOtherJobAcquisitionHint(currentHint)
    const currentMedian = this.getMedian(byHint[currentHint])
    const otherMedian = this.getMedian(byHint[otherHint])
    const winner = otherMedian < currentMedian ? otherHint : currentHint

    if (!workersInstance.hasCompletedInitialJobAcquisitionHintProbe) {
      workersInstance.hasCompletedInitialJobAcquisitionHintProbe = true
      workersInstance.jobAcquisitionHint = winner
      this.resetPendingJobAcquisitionHint(workersInstance)
      logger.info(`Selected job acquisition hint "${winner}" after startup probe.`)
      return
    }

    if (winner === currentHint) {
      this.resetPendingJobAcquisitionHint(workersInstance)
      logger.debug(`Keeping job acquisition hint "${currentHint}" after probe.`)
      return
    }

    if (workersInstance.pendingJobAcquisitionHint === winner) {
      workersInstance.pendingJobAcquisitionHintWins++
    } else {
      workersInstance.pendingJobAcquisitionHint = winner
      workersInstance.pendingJobAcquisitionHintWins = 1
    }

    if (workersInstance.pendingJobAcquisitionHintWins < 2) {
      logger.debug(
        `Keeping job acquisition hint "${currentHint}"; "${winner}" has one consecutive probe win.`,
      )
      return
    }

    workersInstance.jobAcquisitionHint = winner
    this.resetPendingJobAcquisitionHint(workersInstance)
    logger.info(`Changed job acquisition hint from "${currentHint}" to "${winner}".`)
  }

  async waitForNextJobAcquisitionHintProbe(workersInstance: InternalWorkersInstance) {
    await new Promise<void>(resolve => {
      let resolved = false
      const finishWait = () => {
        if (resolved) return
        resolved = true
        clearTimeout(workersInstance.jobAcquisitionHintProbeTimer)
        workersInstance.jobAcquisitionHintProbeTimer = undefined
        workersInstance.cancelJobAcquisitionHintProbeWait = undefined
        resolve()
      }

      workersInstance.jobAcquisitionHintProbeTimer = setTimeout(
        finishWait,
        this.jobAcquisitionHintProbeIntervalMs,
      )
      workersInstance.cancelJobAcquisitionHintProbeWait = finishWait
    })
  }

  async runJobAcquisitionHintProbeLoop(
    config: StartWorkersConfig,
    workersInstance: InternalWorkersInstance,
  ) {
    if (this.getJobNames(config.jobs).length === 0) return

    while (workersInstance.running) {
      await this.runJobAcquisitionHintProbe(config, workersInstance)
      if (!workersInstance.running) return
      await this.waitForNextJobAcquisitionHintProbe(workersInstance)
    }
  }

  createWorkersInstanceDefinition(config: StartWorkersConfig): InternalWorkersInstance {
    let signalStop!: () => void
    const stopSignal = new Promise<void>(resolve => {
      signalStop = resolve
    })

    const workersInstance: InternalWorkersInstance = {
      running: true,
      workersCount: config.workersCount,
      activeExecutions: new Map(),
      staleExecutions: new Map(),
      runningJobsByName: new Map(),
      jobAcquisitionHint: INITIAL_JOB_ACQUISITION_HINT,
      jobAcquisitionHintProbeCycle: 0,
      hasCompletedInitialJobAcquisitionHintProbe: false,
      pendingJobAcquisitionHintWins: 0,
      jobAcquisitionHintProbePromise: Promise.resolve(),
      schedulerPromise: Promise.resolve(),
      stopSignal,
      signalStop,
      get runningExecutions() {
        return this.activeExecutions.size
      },
      stop: async () => {
        if (workersInstance.stopPromise) return workersInstance.stopPromise

        workersInstance.stopPromise = (async () => {
          logger.info('Stopping job scheduler...')
          workersInstance.running = false
          workersInstance.signalStop()
          workersInstance.cancelJobAcquisitionHintProbeWait?.()

          await Promise.all([
            workersInstance.schedulerPromise,
            workersInstance.jobAcquisitionHintProbePromise,
          ])

          const activeCapacity = Array.from(
            workersInstance.activeExecutions.values(),
            execution => execution.capacityPromise,
          )
          await Promise.all(activeCapacity)
        })()

        return workersInstance.stopPromise
      },
    }

    return workersInstance
  }

  async ensureRecords(config: StartWorkersConfig) {
    const jobs = this.getJobs(config.jobs)

    await Promise.all(
      jobs
        .filter(job => job.type === 'recurrent')
        .map(async job => {
          logger.debug(`Ensuring records for job "${job.name}"...`)
          await this.jobsRepo.ensureJobRecord(job)
        }),
    )
  }

  async runScheduler(config: StartWorkersConfig, workersInstance: InternalWorkersInstance) {
    logger.debug('Will ensure maxTriesReached retention and TTL index')
    void this.jobsRepo
      .ensureMaxTriesReachedRetention(config.maxTriesReachedRetentionMs)
      .catch(error => logger.error('Error ensuring maxTriesReached retention', {error}))

    logger.debug('Will ensure records for recurrent jobs')
    await this.ensureRecords(config)

    logger.info(`Starting job scheduler with concurrency ${config.workersCount}`)
    await this.runSchedulerLoop(config, workersInstance)
  }

  /**
   * Starts one job scheduler with the provided concurrency configuration.
   * @param userConfig - Configuration for the scheduler. Required field: jobs
   */
  startWorkers(userConfig: StartWorkersConfig): WorkersInstance {
    const maxTriesReachedRetentionMs =
      userConfig.maxTriesReachedRetentionMs === undefined
        ? DEFAULT_MAX_TRIES_REACHED_RETENTION_MS
        : userConfig.maxTriesReachedRetentionMs

    if (
      maxTriesReachedRetentionMs !== null &&
      (!Number.isFinite(maxTriesReachedRetentionMs) || maxTriesReachedRetentionMs < 0)
    ) {
      throw new Error('maxTriesReachedRetentionMs must be null, zero, or a positive number')
    }

    const config: StartWorkersConfig = {
      pollInterval: 3000,
      workersCount: 4,
      defaultLockTime: 30 * 1000,
      ...userConfig,
      maxTriesReachedRetentionMs,
    }

    setNameToJobs(config.jobs)

    const workersInstance = this.createWorkersInstanceDefinition(config)
    logger.debug('Starting job scheduler', config)

    workersInstance.jobAcquisitionHintProbePromise = this.runJobAcquisitionHintProbeLoop(
      config,
      workersInstance,
    )

    workersInstance.schedulerPromise = this.runScheduler(config, workersInstance).catch(error => {
      workersInstance.running = false
      workersInstance.signalStop()
      workersInstance.cancelJobAcquisitionHintProbeWait?.()
      logger.error('Job scheduler stopped after an unexpected error.', {error})
    })

    return workersInstance
  }
}

function setNameToJobs(jobs: JobsDefinition) {
  for (const name of Object.keys(jobs)) {
    jobs[name].jobName = name
  }
}
