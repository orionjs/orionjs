import {logger} from '@orion-js/logger'
import {Inject, Service} from '@orion-js/services'
import {JobsRepo} from '../repos/JobsRepo'
import {ScheduleJobOptions, ScheduleJobsOptions, ScheduleJobsResult} from '../types/Events'
import {getNextRunDate} from './getNextRunDate'
import {getRandomPartition} from './partitions'

@Service()
export class EventsService {
  @Inject(() => JobsRepo)
  private jobsRepo: JobsRepo

  async scheduleJob(options: ScheduleJobOptions, nPartitions?: number) {
    logger.debug('Scheduling job...', options)
    const configuredPartitions = nPartitions ?? this.jobsRepo.getJobPartitionsCount(options.name)

    await this.jobsRepo.scheduleJob({
      name: options.name,
      priority: options.priority || 100,
      nextRunAt: getNextRunDate(options),
      params: options.params || null,
      uniqueIdentifier: options.uniqueIdentifier,
      partition:
        configuredPartitions === undefined ? undefined : getRandomPartition(configuredPartitions),
    })
  }

  async scheduleJobs(jobs: ScheduleJobsOptions, nPartitions?: number): Promise<ScheduleJobsResult> {
    logger.debug(`Scheduling ${jobs.length} jobs...`)

    const jobRecords = jobs.map(options => {
      const configuredPartitions = nPartitions ?? this.jobsRepo.getJobPartitionsCount(options.name)
      return {
        name: options.name,
        priority: options.priority || 100,
        nextRunAt: getNextRunDate(options),
        params: options.params || null,
        uniqueIdentifier: options.uniqueIdentifier,
        partition:
          configuredPartitions === undefined ? undefined : getRandomPartition(configuredPartitions),
      }
    })

    return await this.jobsRepo.scheduleJobs(jobRecords)
  }
}
