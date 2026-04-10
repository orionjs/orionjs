import {sleep} from '@orion-js/helpers'
import {logger} from '@orion-js/logger'
import {Inject, Service} from '@orion-js/services'
import {JobsRepo} from '../repos/JobsRepo'
import {JobDefinitionWithName, JobsDefinition} from '../types/JobsDefinition'
import {StartWorkersConfig} from '../types/StartConfig'
import {JobToRun, WorkerInstance, WorkersInstance} from '../types/Worker'
import {ExecuteJobConfig, Executor} from './Executor'

@Service()
export class WorkerService {
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
    workersInstance: WorkersInstance,
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

  reserveJobExecution(workersInstance: WorkersInstance, jobName: string) {
    const currentExecutions = workersInstance.runningJobsByName.get(jobName) || 0
    workersInstance.runningJobsByName.set(jobName, currentExecutions + 1)
  }

  releaseJobExecution(workersInstance: WorkersInstance, jobName: string) {
    const currentExecutions = workersInstance.runningJobsByName.get(jobName) || 0
    if (currentExecutions <= 1) {
      workersInstance.runningJobsByName.delete(jobName)
      return
    }

    workersInstance.runningJobsByName.set(jobName, currentExecutions - 1)
  }

  async withJobAcquisitionLock<T>(workersInstance: WorkersInstance, callback: () => Promise<T>) {
    const previousLock = workersInstance.jobAcquisitionLock
    let releaseLock!: () => void
    workersInstance.jobAcquisitionLock = new Promise<void>(resolve => {
      releaseLock = resolve
    })

    await previousLock

    try {
      return await callback()
    } finally {
      releaseLock()
    }
  }

  async getJobAndReserveExecution(
    config: StartWorkersConfig,
    workersInstance: WorkersInstance,
    jobNames: string[],
  ): Promise<JobToRun | undefined> {
    return this.withJobAcquisitionLock(workersInstance, async () => {
      const availableJobNames = this.getAvailableJobNames(config, workersInstance, jobNames)
      if (availableJobNames.length === 0) return

      const jobToRun = await this.jobsRepo.getJobAndLock(availableJobNames, config.defaultLockTime)
      if (!jobToRun) return

      this.reserveJobExecution(workersInstance, jobToRun.name)
      return jobToRun
    })
  }

  async runWorkerLoop(
    config: StartWorkersConfig,
    workersInstance: WorkersInstance,
    workerInstance: WorkerInstance,
    jobNames: string[],
    executeConfig: ExecuteJobConfig,
  ) {
    const jobToRun = await this.getJobAndReserveExecution(config, workersInstance, jobNames)
    if (!jobToRun) {
      logger.debug('No job to run')
      return false
    }

    logger.debug(`Got job [w${workerInstance.workerIndex}] to run:`, jobToRun)

    try {
      await this.executor.executeJob(executeConfig, jobToRun, workerInstance.respawn)
    } finally {
      this.releaseJobExecution(workersInstance, jobToRun.name)
    }

    return true
  }

  async startWorker(
    config: StartWorkersConfig,
    workersInstance: WorkersInstance,
    workerInstance: WorkerInstance,
  ) {
    const names = this.getJobNames(config.jobs)
    logger.debug(
      `Running worker loop [w${workerInstance.workerIndex}] for jobs "${names.join(', ')}"...`,
    )
    const executeConfig: ExecuteJobConfig = {
      jobs: config.jobs,
      maxTries: config.maxTries,
      onMaxTriesReached: config.onMaxTriesReached,
    }

    while (true) {
      if (!workerInstance.running) {
        logger.info(`Got signal to stop. Stopping worker [w${workerInstance.workerIndex}]...`)
        return
      }

      try {
        const didRun = await this.runWorkerLoop(
          config,
          workersInstance,
          workerInstance,
          names,
          executeConfig,
        )
        if (!didRun) await sleep(config.pollInterval)
        if (didRun) await sleep(config.cooldownPeriod)
      } catch (error) {
        logger.error('Error in job runner.', {error})
        await sleep(config.pollInterval)
      }
    }
  }

  createWorkersInstanceDefinition(config: StartWorkersConfig): WorkersInstance {
    const workersInstance: WorkersInstance = {
      running: true,
      workersCount: config.workersCount,
      workers: [],
      runningJobsByName: new Map(),
      jobAcquisitionLock: Promise.resolve(),
      stop: async () => {
        logger.info('Stopping workers...')
        workersInstance.running = false
        const stopingPromises = workersInstance.workers.map(worker => worker.stop())
        await Promise.all(stopingPromises)
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

  async startANewWorker(
    config: StartWorkersConfig,
    workersInstance: WorkersInstance,
    workerIndex = workersInstance.workers.length,
  ) {
    if (!workersInstance.running) {
      return
    }

    const workerInstance: WorkerInstance = {
      running: true,
      workerIndex,
      stop: async () => {
        logger.info(`Stopping worker [w${workerIndex}]...`)
        workerInstance.running = false
        await workerInstance.promise
      },
      respawn: async () => {
        logger.info(`Respawning worker [w${workerIndex}]...`)
        workerInstance.running = false
        await this.startANewWorker(config, workersInstance, workerIndex)
      },
    }

    const workerPromise = this.startWorker(config, workersInstance, workerInstance)

    workerInstance.promise = workerPromise
    workersInstance.workers[workerIndex] = workerInstance
  }

  async runWorkers(config: StartWorkersConfig, workersInstance: WorkersInstance) {
    logger.debug('Will ensure records for recurrent jobs')
    await this.ensureRecords(config)

    const workersCount = config.workersCount
    const workerWord = workersCount === 1 ? 'worker' : 'workers'
    logger.info(`Starting ${workersCount} ${workerWord}`)

    for (let workerIndex = 0; workerIndex < workersCount; workerIndex++) {
      this.startANewWorker(config, workersInstance, workerIndex)
    }
  }

  /**
   * Starts the job workers with the provided configuration.
   * @param userConfig - Configuration for the workers. Required fields: jobs, maxTries, onMaxTriesReached
   */
  startWorkers(userConfig: StartWorkersConfig): WorkersInstance {
    // Apply defaults for optional fields
    const config: StartWorkersConfig = {
      cooldownPeriod: 100,
      pollInterval: 3000,
      workersCount: 4,
      defaultLockTime: 30 * 1000,
      ...userConfig,
    }

    setNameToJobs(config.jobs)

    const workersInstance = this.createWorkersInstanceDefinition(config)
    logger.debug('Starting workers', config)

    this.runWorkers(config, workersInstance)

    return workersInstance
  }
}

function setNameToJobs(jobs: JobsDefinition) {
  for (const name of Object.keys(jobs)) {
    jobs[name].jobName = name
  }
}
