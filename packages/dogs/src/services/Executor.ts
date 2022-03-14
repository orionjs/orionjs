import {Inject, Service} from '@orion-js/services'
import {log} from '../log'
import {JobsRepo} from '../repos/JobsRepo'
import {JobDefinition, JobsDefinition} from '../types/JobsDefinition'
import {ExecutionContext, JobToRun} from '../types/Worker'
import {getNextRunDate} from './getNextRunDate'

@Service()
export class Executor {
  @Inject()
  private jobsRepo: JobsRepo

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
      }
    }
  }

  getJobDefinition(jobToRun: JobToRun, jobs: JobsDefinition) {
    const job = jobs[jobToRun.name]

    if (!jobToRun.isRecurrent && job.type === 'recurrent') {
      log('warn', `Job record ${jobToRun.name} is event but definition is recurrent`)
      return
    }
    if (jobToRun.isRecurrent && job.type === 'event') {
      log('warn', `Job record ${jobToRun.name} is recurrent but definition is event`)
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
      log('error', `Error executing job "${jobToRun.name}"`, error)
      await scheduleRecurrent()
      return
    } else {
      log('debug', `Error executing job "${jobToRun.name}"`, error)
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

  async executeJob(jobs: JobsDefinition, jobToRun: JobToRun) {
    const job = this.getJobDefinition(jobToRun, jobs)
    if (!job) return

    const onStale = () => {
      if (job.onStale) {
        log('debug', `Job "${jobToRun.name}" is stale`)
        job.onStale(jobToRun.params, context)
      } else {
        log('warn', `Job "${jobToRun.name}" is stale`)
      }
    }

    const context = this.getContext(job, jobToRun, onStale)

    try {
      await job.resolve(jobToRun.params, context)
      context.clearStaleTimeout()

      if (job.type === 'recurrent') {
        await this.jobsRepo.scheduleNextRun({
          jobId: jobToRun.jobId,
          nextRunAt: getNextRunDate(job),
          addTries: false
        })
      }
    } catch (error) {
      context.clearStaleTimeout()
      await this.onError(error, job, jobToRun, context)
    }
  }
}
