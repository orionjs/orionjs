import {getInstance} from '@orion-js/services'
import {defineJob} from './defineJob'
import {EventsService} from './services/EventsService'
import {WorkerService} from './services/WorkerService'
import {StartWorkersConfig} from './types/StartConfig'
import {ScheduleJobOptions} from './types/Events'
import {JobsHistoryRepo} from './repos/JobsHistoryRepo'
import {JobsRepo} from './repos/JobsRepo'

export * from './types'
export * from './service'

const workerService = getInstance(WorkerService)
const eventsService = getInstance(EventsService)
const jobsHistoryRepo = getInstance(JobsHistoryRepo)
const jobsRepo = getInstance(JobsRepo)

const startWorkers = (config: Partial<StartWorkersConfig>) => {
  return workerService.startWorkers(config)
}

const scheduleJob = (options: ScheduleJobOptions) => {
  return eventsService.scheduleJob(options)
}

export {defineJob, startWorkers, scheduleJob, jobsHistoryRepo, jobsRepo}
