import {getInstance} from '@orion-js/services'
import {EventsService} from './services/EventsService'
import {WorkerService} from './services/WorkerService'
import {StartWorkersConfig} from './types/StartConfig'
import {ScheduleJobOptions, ScheduleJobsOptions, ScheduleJobsResult} from './types/Events'
import {JobsHistoryRepo} from './repos/JobsHistoryRepo'
import {JobsRepo} from './repos/JobsRepo'
import {SchemaInAnyOrionForm} from '@orion-js/schema'

export * from './types'
export * from './service'
export * from './defineJob'

const workerService = getInstance(WorkerService)
const eventsService = getInstance(EventsService)
const jobsHistoryRepo = getInstance(JobsHistoryRepo)
const jobsRepo = getInstance(JobsRepo)

const startWorkers = (config: StartWorkersConfig) => {
  return workerService.startWorkers(config)
}

/**
 * @deprecated Use the event job definition.schedule method instead.
 */
const scheduleJob = <TParamsSchema extends SchemaInAnyOrionForm = any>(
  options: ScheduleJobOptions<TParamsSchema>,
) => {
  return eventsService.scheduleJob(options)
}

/**
 * Schedule multiple jobs at once for better performance.
 * @deprecated Use the event job definition.scheduleJobs method instead.
 */
const scheduleJobs = <TParamsSchema extends SchemaInAnyOrionForm = any>(
  jobs: ScheduleJobsOptions<TParamsSchema>,
): Promise<ScheduleJobsResult> => {
  return eventsService.scheduleJobs(jobs)
}

export {startWorkers, scheduleJob, scheduleJobs, jobsHistoryRepo, jobsRepo}
