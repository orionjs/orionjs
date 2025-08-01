import {logger} from '@orion-js/logger'
import {Inject, Service} from '@orion-js/services'
import {JobsRepo} from '../repos/JobsRepo'
import {ScheduleJobOptions, ScheduleJobsOptions, ScheduleJobsResult} from '../types/Events'
import {getNextRunDate} from './getNextRunDate'

@Service()
export class EventsService {
  @Inject(() => JobsRepo)
  private jobsRepo: JobsRepo

  async scheduleJob(options: ScheduleJobOptions) {
    logger.debug('Scheduling job...', options)

    await this.jobsRepo.scheduleJob({
      name: options.name,
      priority: options.priority || 100,
      nextRunAt: getNextRunDate(options),
      params: options.params || null,
      uniqueIdentifier: options.uniqueIdentifier,
    })
  }

  async scheduleJobs(jobs: ScheduleJobsOptions): Promise<ScheduleJobsResult> {
    logger.debug(`Scheduling ${jobs.length} jobs...`)

    const jobRecords = jobs.map(options => ({
      name: options.name,
      priority: options.priority || 100,
      nextRunAt: getNextRunDate(options),
      params: options.params || null,
      uniqueIdentifier: options.uniqueIdentifier,
    }))

    return await this.jobsRepo.scheduleJobs(jobRecords)
  }
}
