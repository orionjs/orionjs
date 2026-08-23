import {SchemaInAnyOrionForm} from '@orion-js/schema'
import {getInstance} from '@orion-js/services'
import {JobsHistoryRepo} from './repos/JobsHistoryRepo'
import {JobsRepo} from './repos/JobsRepo'
import {scheduleJobInternal, scheduleJobsInternal} from './schedule'
import {WorkerService} from './services/WorkerService'
import {ScheduleJobOptions, ScheduleJobsOptions, ScheduleJobsResult} from './types/Events'
import {StartWorkersConfig} from './types/StartConfig'

export * from './defineJob'
export * from './service'
export * from './types'

const workerService = getInstance(WorkerService)
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
  return scheduleJobInternal(options)
}

/**
 * Schedule multiple jobs at once for better performance.
 * @deprecated Use the event job definition.scheduleJobs method instead.
 */
const scheduleJobs = <TParamsSchema extends SchemaInAnyOrionForm = any>(
  jobs: ScheduleJobsOptions<TParamsSchema>,
): Promise<ScheduleJobsResult> => {
  return scheduleJobsInternal(jobs)
}

export {startWorkers, scheduleJob, scheduleJobs, jobsHistoryRepo, jobsRepo}
