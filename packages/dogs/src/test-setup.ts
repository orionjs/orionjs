import {setLogLevel} from '@orion-js/logger'
import {Container} from '@orion-js/services'
import {JobsRepo} from './repos/JobsRepo'
import {JobsHistoryRepo} from './repos/JobsHistoryRepo'
import {EventsService} from './services/EventsService'
import {WorkerService} from './services/WorkerService'
import {Executor} from './services/Executor'

// Set log level to error for tests
setLogLevel('error')

// Reset container
Container.reset()

// Register all services and repositories with their proper types
Container.set(JobsRepo, new JobsRepo())
Container.set(JobsHistoryRepo, new JobsHistoryRepo())
Container.set(EventsService, new EventsService())
Container.set(WorkerService, new WorkerService())
Container.set(Executor, new Executor())
