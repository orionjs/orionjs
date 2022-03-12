import {Inject, Service} from '@orion-js/services'
import {log} from '../log'
import {JobsRepo} from '../repos/JobsRepo'
import {ScheduleJobOptions} from '../types/Events'
import {getNextRunDate} from './getNextRunDate'

@Service()
export class EventsService {
  @Inject()
  private jobsRepo: JobsRepo

  async scheduleJob(options: ScheduleJobOptions) {
    log('debug', 'Scheduling job...', options)

    await this.jobsRepo.scheduleJob({
      name: options.name,
      priority: options.priority || 1,
      nextRunAt: getNextRunDate(options),
      params: options.params || {}
    })
  }
}
