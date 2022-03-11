import {getInstance} from '@orion-js/services'
import {defineJob} from './defineJob'
import {WorkerService} from './services/WorkerService'
import {StartWorkersConfig} from './types/StartConfig'

const workerService = getInstance(WorkerService)

const startWorkers = (config: Partial<StartWorkersConfig>) => {
  return workerService.startWorkers(config)
}

export {defineJob, startWorkers}
