import {Inject, Service} from '@orion-js/services'
import {range} from 'rambdax'
import {JobsRepo} from '../repos/JobsRepo'
import {JobDefinitionWithName, JobsDefinition} from '../types/JobsDefinition'
import {StartWorkersConfig} from '../types/StartConfig'
import {sleep} from '@orion-js/helpers'
import {Executor, ExecuteJobConfig} from './Executor'
import {WorkerInstance, WorkersInstance} from '../types/Worker'
import {logger} from '@orion-js/logger'

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

  async runWorkerLoop(config: StartWorkersConfig, workerInstance: WorkerInstance) {
    const names = this.getJobNames(config.jobs)
    logger.debug(
      `Running worker loop [w${workerInstance.workerIndex}] for jobs "${names.join(', ')}"...`,
    )
    const jobToRun = await this.jobsRepo.getJobAndLock(names, config.defaultLockTime)
    if (!jobToRun) {
      logger.debug('No job to run')
      return false
    }

    logger.debug(`Got job [w${workerInstance.workerIndex}] to run:`, jobToRun)

    // Build the execution config from the worker config
    const executeConfig: ExecuteJobConfig = {
      jobs: config.jobs,
      maxTries: config.maxTries,
      onMaxTriesReached: config.onMaxTriesReached,
    }

    await this.executor.executeJob(executeConfig, jobToRun, workerInstance.respawn)

    return true
  }

  async startWorker(config: StartWorkersConfig, workerInstance: WorkerInstance) {
    while (true) {
      if (!workerInstance.running) {
        logger.info(`Got signal to stop. Stopping worker [w${workerInstance.workerIndex}]...`)
        return
      }

      try {
        const didRun = await this.runWorkerLoop(config, workerInstance)
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

  async startANewWorker(config: StartWorkersConfig, workersInstance: WorkersInstance) {
    const workerIndex = workersInstance.workers.length

    logger.info(`Starting worker [w${workerIndex}]`)

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
        workerInstance.stop()
        await this.startANewWorker(config, workersInstance)
      },
    }

    const workerPromise = this.startWorker(config, workerInstance)

    workerInstance.promise = workerPromise
    workersInstance.workers.push(workerInstance)
  }

  async runWorkers(config: StartWorkersConfig, workersInstance: WorkersInstance) {
    logger.debug('Will ensure records for recurrent jobs')
    await this.ensureRecords(config)

    for (const _ of range(0, config.workersCount)) {
      this.startANewWorker(config, workersInstance)
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
  return Object.keys(jobs).map(name => {
    jobs[name].jobName = name
  })
}
