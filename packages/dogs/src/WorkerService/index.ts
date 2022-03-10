import {Service} from '@orion-js/services'
import {range} from 'lodash'
import {JobsRepo} from '../JobsRepo'
import {JobDefinition, JobsDefinition} from '../types/JobsDefinition'
import {StartWorkersConfig} from '../types/StartConfig'
import {sleep} from '@orion-js/helpers'
import {JobToRun} from '../types/Worker'
import {getNextRunDate} from './getNextRunDate'

@Service()
export class WorkerService {
  private jobsRepo: JobsRepo

  getJobNames(jobs: JobsDefinition) {
    return Object.keys(jobs)
  }

  getContext(job: JobDefinition, jobToRun: JobToRun) {
    return {
      definition: job,
      record: jobToRun,
      extendLockUntil: (lockUntil: Date) => this.jobsRepo.extendLockUntil(jobToRun.jobId, lockUntil)
    }
  }

  async executeJob(job: JobDefinition, jobToRun: JobToRun) {
    try {
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

  async runWorkerLoop(jobs: JobsDefinition) {
    const names = this.getJobNames(jobs)
    const jobToRun = await this.jobsRepo.getJobAndLock(names)
    if (!jobToRun) return await sleep(5000)

    const jobDefinition = jobs[jobToRun.name]
    await this.executeJob(jobDefinition, jobToRun)

    await sleep(100)
  }

  async startWorker(jobs: JobsDefinition) {
    while (true) {
      try {
        await this.runWorkerLoop(jobs)
      } catch (error) {
        console.error(error)
        await sleep(5000)
      }
    }
  }

  async startWorkers(config: StartWorkersConfig) {
    for (const workerIndex of range(config.workerCount)) {
      this.startWorker(config.jobs)
    }
  }
}
