import {getInstance} from '@orion-js/services'
import {EventsService} from './services/EventsService'
import {WorkerService} from './services/WorkerService'
import {StartWorkersConfig} from './types/StartConfig'
import {ScheduleJobOptions} from './types/Events'
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

const startWorkers = (config: Partial<StartWorkersConfig>) => {
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

export {startWorkers, scheduleJob, jobsHistoryRepo, jobsRepo}
