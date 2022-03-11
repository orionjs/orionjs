import {Inject, Service} from '@orion-js/services'
import {log} from '../log'
import {JobsRepo} from '../repos/JobsRepo'
import {JobDefinition, JobsDefinition} from '../types/JobsDefinition'
import {JobToRun} from '../types/Worker'
import {getNextRunDate} from './getNextRunDate'

@Service()
export class Executor {
  @Inject()
  private jobsRepo: JobsRepo

  getContext(job: JobDefinition, jobToRun: JobToRun) {
    return {
      definition: job,
      record: jobToRun,
      extendLockUntil: (lockUntil: Date) => this.jobsRepo.extendLockUntil(jobToRun.jobId, lockUntil)
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

  async executeJob(jobs: JobsDefinition, jobToRun: JobToRun) {
    try {
      const job = this.getJobDefinition(jobToRun, jobs)
      const context = this.getContext(job, jobToRun)
      await job.resolve(jobToRun.params, context)
      if (job.type === 'recurrent') {
        await this.jobsRepo.scheduleNextRun({
          jobId: jobToRun.jobId,
          nextRunAt: getNextRunDate({runEvery: job.runEvery, getNextRun: job.getNextRun})
        })
      }
    } catch (error) {}
  }
}
