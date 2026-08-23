import {SchemaInAnyOrionForm} from '@orion-js/schema'
import {getInstance} from '@orion-js/services'
import {EventsService} from './services/EventsService'
import {ScheduleJobOptions, ScheduleJobsOptions, ScheduleJobsResult} from './types/Events'

const eventsService = getInstance(EventsService)

export function scheduleJobInternal<TParamsSchema extends SchemaInAnyOrionForm = any>(
  options: ScheduleJobOptions<TParamsSchema>,
  nPartitions?: number,
) {
  return eventsService.scheduleJob(options, nPartitions)
}

export function scheduleJobsInternal<TParamsSchema extends SchemaInAnyOrionForm = any>(
  jobs: ScheduleJobsOptions<TParamsSchema>,
  nPartitions?: number,
): Promise<ScheduleJobsResult> {
  return eventsService.scheduleJobs(jobs, nPartitions)
}
