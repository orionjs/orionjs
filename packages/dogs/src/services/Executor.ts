import {SpanStatusCode, trace} from '@opentelemetry/api'
import {logger, runWithOrionAsyncContext, updateOrionAsyncContext} from '@orion-js/logger'
import {Blackbox} from '@orion-js/schema'
import {Inject, Service} from '@orion-js/services'
import {JobsHistoryRepo} from '../repos/JobsHistoryRepo'
import {JobsRepo} from '../repos/JobsRepo'
import {JobDefinition, JobsDefinition} from '../types/JobsDefinition'
import {ExecutionContext, JobToRun} from '../types/Worker'
import {getNextRunDate} from './getNextRunDate'

/**
 * Configuration for job execution including max tries settings.
 */
export interface ExecuteJobConfig {
  jobs: JobsDefinition
  maxTries: number
  onMaxTriesReached: (job: JobToRun) => Promise<void>
}

@Service()
export class Executor {
  @Inject(() => JobsRepo)
  private readonly jobsRepo: JobsRepo

  @Inject(() => JobsHistoryRepo)
  private readonly jobsHistoryRepo: JobsHistoryRepo

  /**
   * Determines the effective lock time for a job execution.
   * Job-specific lockTime takes precedence over the default lockTime from config.
   */
  getEffectiveLockTime(job: JobDefinition, jobToRun: JobToRun): number {
    return job.lockTime ?? jobToRun.lockTime
  }

  getContext(job: JobDefinition, jobToRun: JobToRun, onStale: Function): ExecutionContext {
    const effectiveLockTime = this.getEffectiveLockTime(job, jobToRun)
    let staleTimeout = setTimeout(() => onStale(), effectiveLockTime)
    staleTimeout.unref?.()
    return {
      definition: job,
      record: jobToRun,
      tries: jobToRun.tries || 0,
      clearStaleTimeout: () => clearTimeout(staleTimeout),
      extendLockTime: async (extraTime: number) => {
        clearTimeout(staleTimeout)
        staleTimeout = setTimeout(() => onStale(), extraTime)
        staleTimeout.unref?.()
        await this.jobsRepo.extendLockTime(jobToRun.jobId, extraTime)
      },
      logger: logger.addMetadata({
        jobName: jobToRun.name,
        jobId: jobToRun.jobId,
      }),
    }
  }

  getJobDefinition(jobToRun: JobToRun, jobs: JobsDefinition) {
    const job = jobs[jobToRun.name]

    if (jobToRun.type !== job.type) {
      logger.warn(
        `Job record "${jobToRun.name}" is "${jobToRun.type}" but definition is "${job.type}"`,
      )
      return
    }

    return job
  }

  /**
   * Determines the effective max tries for a job.
   * Job-specific maxTries takes precedence over the global maxTries from config.
   */
  getEffectiveMaxTries(job: JobDefinition, globalMaxTries: number): number {
    return job.maxTries ?? globalMaxTries
  }

  /**
   * Handles when a job has reached its maximum retry attempts.
   * Marks the job in the database and invokes the onMaxTriesReached callback.
   */
  async handleMaxTriesReached(
    jobToRun: JobToRun,
    context: ExecutionContext,
    onMaxTriesReached: (job: JobToRun) => Promise<void>,
  ) {
    context.logger.warn(
      `Job "${jobToRun.name}" has reached max tries (${jobToRun.tries}). Marking as maxTriesReached.`,
    )
    await this.jobsRepo.markJobAsMaxTriesReached(jobToRun.jobId)

    // Invoke the callback to notify administrators
    try {
      await onMaxTriesReached(jobToRun)
    } catch (callbackError) {
      context.logger.error(`Error in onMaxTriesReached callback for job "${jobToRun.name}"`, {
        error: callbackError,
      })
    }
  }

  async onError(
    error: unknown,
    job: JobDefinition,
    jobToRun: JobToRun,
    context: ExecutionContext,
    config: ExecuteJobConfig,
  ) {
    const effectiveMaxTries = this.getEffectiveMaxTries(job, config.maxTries)

    // Helper to schedule next run for recurrent jobs (used when dismissing)
    const scheduleRecurrent = async () => {
      if (job.type === 'recurrent') {
        await this.jobsRepo.scheduleNextRun({
          jobId: jobToRun.jobId,
          nextRunAt: getNextRunDate(job),
          addTries: false,
          priority: job.priority,
        })
      }
    }

    // Helper to handle retry with max tries check
    const handleRetry = async (nextRunAt: Date) => {
      // Check if we've reached max tries before scheduling another retry
      if (jobToRun.tries >= effectiveMaxTries) {
        await this.handleMaxTriesReached(jobToRun, context, config.onMaxTriesReached)
        return
      }

      await this.jobsRepo.scheduleNextRun({
        jobId: jobToRun.jobId,
        nextRunAt,
        addTries: true,
        priority: job.type === 'recurrent' ? job.priority : jobToRun.priority,
      })
    }

    // If no custom error handler, check max tries and schedule recurrent if applicable
    if (!job.onError) {
      context.logger.error(`Error executing job "${jobToRun.name}"`, {error})

      // For jobs without onError, check if max tries reached
      if (jobToRun.tries >= effectiveMaxTries) {
        await this.handleMaxTriesReached(jobToRun, context, config.onMaxTriesReached)
        return
      }

      await scheduleRecurrent()
      return
    }

    context.logger.info(`Error executing job "${jobToRun.name}"`, {error})
    const result = await job.onError(
      error instanceof Error ? error : new Error(String(error)),
      jobToRun.params,
      context,
    )

    if (result.action === 'dismiss') {
      await scheduleRecurrent()
      return
    }

    if (result.action === 'retry') {
      await handleRetry(getNextRunDate(result))
    }
  }

  async saveExecution(options: {
    startedAt: Date
    status: 'stale' | 'error' | 'success'
    errorMessage?: string
    result?: Blackbox
    job: JobDefinition
    jobToRun: JobToRun
  }) {
    const {startedAt, status, errorMessage, result, job, jobToRun} = options
    const endedAt = new Date()

    if (job.saveExecutionsFor !== 0) {
      const oneWeek = 1000 * 60 * 60 * 24 * 7
      const saveExecutionsFor = job.saveExecutionsFor || oneWeek
      await this.jobsHistoryRepo.saveExecution({
        jobId: jobToRun.jobId,
        executionId: jobToRun.executionId,
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
        result,
      })
    }
  }

  async afterExecutionSuccess(job: JobDefinition, jobToRun: JobToRun, context: ExecutionContext) {
    if (job.type === 'recurrent') {
      context.logger.debug(`Scheduling next run for recurrent job "${jobToRun.name}"`)
      await this.jobsRepo.scheduleNextRun({
        jobId: jobToRun.jobId,
        nextRunAt: getNextRunDate(job),
        addTries: false,
        priority: job.priority,
      })
    }
    if (job.type === 'event') {
      context.logger.debug(`Removing event job after success "${jobToRun.name}"`)
      await this.jobsRepo.deleteEventJob(jobToRun.jobId)
    }
  }

  async executeJob(config: ExecuteJobConfig, jobToRun: JobToRun, respawnWorker: () => void) {
    const job = this.getJobDefinition(jobToRun, config.jobs)
    if (!job) return

    // If job has a custom lockTime different from the default, update the database lock
    const effectiveLockTime = this.getEffectiveLockTime(job, jobToRun)
    if (effectiveLockTime !== jobToRun.lockTime) {
      await this.jobsRepo.updateLockTime(jobToRun.jobId, effectiveLockTime)
    }

    const tracer = trace.getTracer('orionjs.dogs', '1.0')

    await tracer.startActiveSpan(`job.${jobToRun.name}.${jobToRun.executionId}`, async span => {
      try {
        const startedAt = new Date()

        const onStale = async () => {
          if (job.onStale) {
            context.logger.info(`Job "${jobToRun.name}" is stale`)
            job.onStale(jobToRun.params, context)
          } else {
            context.logger.error(`Job "${jobToRun.name}" is stale`)
          }

          await this.jobsRepo.setJobRecordPriority(jobToRun.jobId, 0)

          void respawnWorker()

          void this.saveExecution({
            startedAt,
            status: 'stale',
            result: null,
            errorMessage: null,
            job,
            jobToRun,
          }).catch(error => {
            context.logger.error('Error saving stale execution history', {error})
          })
        }

        const context = this.getContext(job, jobToRun, onStale)

        const extraContext = {
          controllerType: 'job' as const,
          jobName: jobToRun.name,
          params: jobToRun.params,
        }

        await runWithOrionAsyncContext(extraContext, async () => {
          try {
            // Inject async context update
            updateOrionAsyncContext({
              jobName: jobToRun.name,
              params: jobToRun.params,
            })
            const result = await job.resolve(jobToRun.params, context)
            context.clearStaleTimeout()

            void this.saveExecution({
              startedAt,
              status: 'success',
              result: result || null,
              errorMessage: null,
              job,
              jobToRun,
            }).catch(error => {
              context.logger.error('Error saving successful execution history', {error})
            })

            await this.afterExecutionSuccess(job, jobToRun, context)
          } catch (error) {
            context.clearStaleTimeout()
            void this.saveExecution({
              startedAt,
              status: 'error',
              result: null,
              errorMessage: (error as Error).message,
              job,
              jobToRun,
            }).catch(saveError => {
              context.logger.error('Error saving failed execution history', {error: saveError})
            })

            await this.onError(error, job, jobToRun, context, config)
          }
        })
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        })
        throw error
      } finally {
        span.end()
      }
    })
  }
}
