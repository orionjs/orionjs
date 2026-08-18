import {getInstance} from '@orion-js/services'
import {WorkerService} from './WorkerService'

describe('WorkerService', () => {
  it('should have a startWorker method', () => {
    const workerService = getInstance(WorkerService)
    expect(workerService.startWorkers).toBeDefined()
  })

  it('should reject invalid maxTriesReached retention values', () => {
    const workerService = getInstance(WorkerService)

    expect(() =>
      workerService.startWorkers({
        jobs: {},
        maxTriesReachedRetentionMs: -1,
      }),
    ).toThrow('maxTriesReachedRetentionMs must be null, zero, or a positive number')
  })
})
