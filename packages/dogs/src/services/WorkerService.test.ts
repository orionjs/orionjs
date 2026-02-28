import {getInstance} from '@orion-js/services'
import {WorkerService} from './WorkerService'

describe('WorkerService', () => {
  it('should have a startWorker method', () => {
    const workerService = getInstance(WorkerService)
    expect(workerService.startWorkers).toBeDefined()
  })
})
