import {SpanStatusCode, trace} from '@opentelemetry/api'
import {logger, runWithOrionAsyncContext, updateOrionAsyncContext} from '@orion-js/logger'
import {Blackbox} from '@orion-js/schema'
import {Inject, Service} from '@orion-js/services'
import {JobsHistoryRepo} from '../repos/JobsHistoryRepo'
import {JobsRepo} from '../repos/JobsRepo'
import {EventJobDefinition, JobDefinition, JobsDefinition} from '../types/JobsDefinition'
import {ExecutionContext, JobToRun} from '../types/Worker'
import {getNextRunDate} from './getNextRunDate'

/**
 * Configuration for job execution including max tries settings.
 */
export interface ExecuteJobConfig {
  jobs: JobsDefinition
  maxTries?: number
  maxTriesReachedRetentionMs?: number | null
  onMaxTriesReached?: (job: JobToRun) => Promise<void>
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

  getContext(job: JobDefinition, jobToRun: JobToRun, onStale: () => void): ExecutionContext {
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
        let didExtend = false
        try {
          didExtend = await this.jobsRepo.extendLockTime(jobToRun.jobId, extraTime, jobToRun.lockId)
        } catch (error) {
          onStale()
          throw error
        }
        if (!didExtend) {
          onStale()
          return
        }
        staleTimeout = setTimeout(() => onStale(), extraTime)
        staleTimeout.unref?.()
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
   * Determines the effective max tries for an event job.
   * Job-specific maxTries takes precedence over the global maxTries from config.
   */
  getEffectiveMaxTries(job: EventJobDefinition, globalMaxTries?: number): number | undefined {
    return job.maxTries ?? globalMaxTries
  }

  /**
   * Handles when a job has reached its maximum retry attempts.
   * Marks the job in the database and invokes the onMaxTriesReached callback when provided.
   */
  async handleMaxTriesReached(
    jobToRun: JobToRun,
    retentionMs?: number | null,
    onMaxTriesReached?: (job: JobToRun) => Promise<void>,
  ) {
    const jobLogger = logger.addMetadata({
      jobName: jobToRun.name,
      jobId: jobToRun.jobId,
    })

    jobLogger.warn(
      `Job "${jobToRun.name}" has exceeded max tries (${jobToRun.tries}). Marking as maxTriesReached.`,
    )
    const didMark = await this.jobsRepo.markJobAsMaxTriesReached(
      jobToRun.jobId,
      retentionMs,
      jobToRun.lockId,
    )

    if (!didMark) {
      jobLogger.warn(`Could not mark job "${jobToRun.name}" because its lock is no longer owned`)
      return false
    }

    if (!onMaxTriesReached) return true

    // Invoke the callback to notify administrators
    try {
      await onMaxTriesReached(jobToRun)
    } catch (callbackError) {
      jobLogger.error(`Error in onMaxTriesReached callback for job "${jobToRun.name}"`, {
        error: callbackError,
      })
    }

    return true
  }

  async onError(error: unknown, job: JobDefinition, jobToRun: JobToRun, context: ExecutionContext) {
    // Helper to schedule next run for recurrent jobs (used when dismissing)
    const scheduleRecurrent = async () => {
      if (job.type === 'recurrent') {
        return this.jobsRepo.scheduleNextRun({
          jobId: jobToRun.jobId,
          nextRunAt: getNextRunDate(job),
          resetTries: true,
          priority: job.priority,
          lockId: jobToRun.lockId,
        })
      }
      return true
    }

    const handleRetry = async (nextRunAt: Date) => {
      return this.jobsRepo.scheduleNextRun({
        jobId: jobToRun.jobId,
        nextRunAt,
        resetTries: false,
        priority: job.type === 'recurrent' ? job.priority : jobToRun.priority,
        lockId: jobToRun.lockId,
      })
    }

    if (!job.onError) {
      context.logger.error(`Error executing job "${jobToRun.name}"`, {error})

      return scheduleRecurrent()
    }

    context.logger.info(`Error executing job "${jobToRun.name}"`, {error})
    const result = await job.onError(
      error instanceof Error ? error : new Error(String(error)),
      jobToRun.params,
      context,
    )

    if (result.action === 'dismiss') {
      return scheduleRecurrent()
    }

    if (result.action === 'retry') {
      return handleRetry(getNextRunDate(result))
    }

    return true
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
      return this.jobsRepo.scheduleNextRun({
        jobId: jobToRun.jobId,
        nextRunAt: getNextRunDate(job),
        resetTries: true,
        priority: job.priority,
        lockId: jobToRun.lockId,
      })
    }
    if (job.type === 'event') {
      context.logger.debug(`Removing event job after success "${jobToRun.name}"`)
      return this.jobsRepo.deleteEventJob(jobToRun.jobId, jobToRun.lockId)
    }
    return false
  }

  async executeJob(config: ExecuteJobConfig, jobToRun: JobToRun, onExecutionStale: () => void) {
    const job = this.getJobDefinition(jobToRun, config.jobs)
    if (!job) return

    if (job.type === 'event') {
      const effectiveMaxTries = this.getEffectiveMaxTries(job, config.maxTries)
      if (typeof effectiveMaxTries === 'number' && jobToRun.tries > effectiveMaxTries) {
        await this.handleMaxTriesReached(
          jobToRun,
          config.maxTriesReachedRetentionMs,
          config.onMaxTriesReached,
        )
        return
      }
    }

    // If job has a custom lockTime different from the default, update the database lock
    const effectiveLockTime = this.getEffectiveLockTime(job, jobToRun)
    if (effectiveLockTime !== jobToRun.lockTime) {
      const didUpdateLock = await this.jobsRepo.updateLockTime(
        jobToRun.jobId,
        effectiveLockTime,
        jobToRun.lockId,
      )
      if (!didUpdateLock) {
        logger.warn(`Will not execute job "${jobToRun.name}" because its lock is no longer owned`)
        return
      }
    }

    const tracer = trace.getTracer('orionjs.dogs', '1.0')

    await tracer.startActiveSpan(`job.${jobToRun.name}.${jobToRun.executionId}`, async span => {
      try {
        const startedAt = new Date()
        let executionStatus: 'running' | 'stale' = 'running'
        let staleHandlingPromise: Promise<void> | undefined
        let context: ExecutionContext

        const markAsStale = () => {
          if (executionStatus === 'stale') return staleHandlingPromise

          executionStatus = 'stale'
          context.clearStaleTimeout()

          staleHandlingPromise = (async () => {
            context.logger.warn(`Job "${jobToRun.name}" is stale`)

            if (job.onStale) {
              void Promise.resolve(job.onStale(jobToRun.params, context)).catch(error => {
                context.logger.error(`Error in onStale callback for job "${jobToRun.name}"`, {
                  error,
                })
              })
            }

            try {
              await this.jobsRepo.setJobRecordPriority(jobToRun.jobId, 0, jobToRun.lockId)
            } catch (error) {
              context.logger.error(`Error lowering priority for stale job "${jobToRun.name}"`, {
                error,
              })
            } finally {
              // Preserve the current ordering guarantee: a stale retry only becomes eligible for
              // local capacity after its priority has been lowered.
              onExecutionStale()
            }

            await this.saveExecution({
              startedAt,
              status: 'stale',
              result: null,
              errorMessage: null,
              job,
              jobToRun,
            })
          })().catch(error => {
            context.logger.error('Error handling stale execution', {error})
          })

          return staleHandlingPromise
        }

        context = this.getContext(job, jobToRun, () => void markAsStale())

        const extraContext = {
          controllerType: 'job' as const,
          jobName: jobToRun.name,
          jobId: jobToRun.jobId,
          params: jobToRun.params,
        }

        await runWithOrionAsyncContext(extraContext, async () => {
          try {
            // Inject async context update
            updateOrionAsyncContext({
              jobName: jobToRun.name,
              jobId: jobToRun.jobId,
              params: jobToRun.params,
            })
            const result = await job.resolve(jobToRun.params, context)
            context.clearStaleTimeout()

            if (executionStatus === 'stale') {
              await staleHandlingPromise
              context.logger.warn(
                `Ignoring late success from stale execution "${jobToRun.executionId}"`,
              )
              return
            }

            const stillOwnsJob = await this.afterExecutionSuccess(job, jobToRun, context)
            if (!stillOwnsJob) {
              await markAsStale()
              return
            }

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
          } catch (error) {
            context.clearStaleTimeout()

            if (executionStatus === 'stale') {
              await staleHandlingPromise
              context.logger.warn(
                `Ignoring late error from stale execution "${jobToRun.executionId}"`,
                {error},
              )
              return
            }

            const stillOwnsJob = await this.onError(error, job, jobToRun, context)
            if (!stillOwnsJob) {
              await markAsStale()
              return
            }

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
