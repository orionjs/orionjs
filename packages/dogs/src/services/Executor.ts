import {logger} from '@orion-js/logger'
import {Inject, Service} from '@orion-js/services'
import {JobsHistoryRepo} from '../repos/JobsHistoryRepo'
import {JobsRepo} from '../repos/JobsRepo'
import {PlainObject} from '../types/HistoryRecord'
import {JobDefinition, JobsDefinition} from '../types/JobsDefinition'
import {ExecutionContext, JobToRun} from '../types/Worker'
import {getNextRunDate} from './getNextRunDate'

@Service()
export class Executor {
  @Inject()
  private jobsRepo: JobsRepo

  @Inject()
  private jobsHistoryRepo: JobsHistoryRepo

  getContext(job: JobDefinition, jobToRun: JobToRun, onStale: Function): ExecutionContext {
    let staleTimeout = setTimeout(() => onStale(), jobToRun.lockTime)
    return {
      definition: job,
      record: jobToRun,
      tries: jobToRun.tries || 0,
      clearStaleTimeout: () => clearTimeout(staleTimeout),
      extendLockTime: async (extraTime: number) => {
        clearTimeout(staleTimeout)
        staleTimeout = setTimeout(() => onStale(), extraTime)
        await this.jobsRepo.extendLockTime(jobToRun.jobId, extraTime)
      },
      logger: logger.addMetadata({
        jobName: jobToRun.name,
        jobId: jobToRun.jobId
      })
    }
  }

  getJobDefinition(jobToRun: JobToRun, jobs: JobsDefinition) {
    const job = jobs[jobToRun.name]

    if (jobToRun.type !== job.type) {
      logger.warn(
        `Job record "${jobToRun.name}" is "${jobToRun.type}" but definition is "${job.type}"`
      )
      return
    }

    return job
  }

  async onError(error: any, job: JobDefinition, jobToRun: JobToRun, context: ExecutionContext) {
    const scheduleRecurrent = async () => {
      if (job.type === 'recurrent') {
        await this.jobsRepo.scheduleNextRun({
          jobId: jobToRun.jobId,
          nextRunAt: getNextRunDate(job),
          addTries: false
        })
      }
    }

    if (!job.onError) {
      context.logger.error(`Error executing job "${jobToRun.name}"`, error)
      await scheduleRecurrent()
      return
    } else {
      context.logger.info(`Error executing job "${jobToRun.name}"`, error)
    }

    const result = await job.onError(error, jobToRun.params, context)

    if (result.action === 'dismiss') {
      await scheduleRecurrent()
      return
    }

    if (result.action === 'retry') {
      await this.jobsRepo.scheduleNextRun({
        jobId: jobToRun.jobId,
        nextRunAt: getNextRunDate(result),
        addTries: true
      })
    }
  }

  async saveExecution(options: {
    startedAt: Date
    status: 'stale' | 'error' | 'success'
    errorMessage?: string
    result?: PlainObject
    job: JobDefinition
    jobToRun: JobToRun
  }) {
    const {startedAt, status, errorMessage, result, job, jobToRun} = options
    const endedAt = new Date()

    if (job.saveExecutionsFor !== 0) {
      const saveExecutionsFor = job.saveExecutionsFor || 24 * 60 * 60 * 1000
      await this.jobsHistoryRepo.saveExecution({
        executionId: jobToRun.jobId,
        jobName: jobToRun.name,
        type: jobToRun.type,
        priority: jobToRun.priority,
        tries: jobToRun.tries,
        uniqueIdentifier: jobToRun.uniqueIdentifier,
        startedAt,
        endedAt,
        duration: endedAt.getTime() - startedAt.getTime(),
        expiresAt: new Date(Date.now() + saveExecutionsFor),
        status,
        errorMessage,
        params: jobToRun.params,
        result
      })
    }
  }

  async afterExecutionSuccess(job: JobDefinition, jobToRun: JobToRun, context: ExecutionContext) {
    if (job.type === 'recurrent') {
      context.logger.info(`Scheduling next run for recurrent job "${jobToRun.name}"`)
      await this.jobsRepo.scheduleNextRun({
        jobId: jobToRun.jobId,
        nextRunAt: getNextRunDate(job),
        addTries: false
      })
    }
    if (job.type === 'event') {
      context.logger.info(`Removing event job after success "${jobToRun.name}"`)
      await this.jobsRepo.deleteEventJob(jobToRun.jobId)
    }
  }

  async executeJob(jobs: JobsDefinition, jobToRun: JobToRun) {
    const job = this.getJobDefinition(jobToRun, jobs)
    if (!job) return

    const startedAt = new Date()

    const onStale = () => {
      if (job.onStale) {
        context.logger.info(`Job "${jobToRun.name}" is stale`)
        job.onStale(jobToRun.params, context)
      } else {
        context.logger.error(`Job "${jobToRun.name}" is stale`)
      }
      this.saveExecution({
        startedAt,
        status: 'stale',
        result: null,
        errorMessage: null,
        job,
        jobToRun
      })
    }

    const context = this.getContext(job, jobToRun, onStale)

    try {
      const result = await job.resolve(jobToRun.params, context)
      context.clearStaleTimeout()

      this.saveExecution({
        startedAt,
        status: 'success',
        result: result || null,
        errorMessage: null,
        job,
        jobToRun
      })

      await this.afterExecutionSuccess(job, jobToRun, context)
    } catch (error) {
      context.clearStaleTimeout()
      this.saveExecution({
        startedAt,
        status: 'error',
        result: null,
        errorMessage: error.message,
        job,
        jobToRun
      })

      await this.onError(error, job, jobToRun, context)
    }
  }
}
