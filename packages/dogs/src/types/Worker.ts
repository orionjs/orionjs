import {OrionLogger} from '@orion-js/logger'
import {Blackbox} from '@orion-js/schema'
import {JobDefinition} from './JobsDefinition'

export interface JobToRun {
  jobId: string
  executionId: string
  name: string
  type: 'event' | 'recurrent'
  params: Blackbox
  tries: number
  lockTime: number
  priority: number
  uniqueIdentifier?: string
  wasStale?: boolean
}

export interface ExecutionContext {
  record: JobToRun
  definition: JobDefinition
  tries: number
  logger: OrionLogger
  extendLockTime: (extraTime: number) => Promise<void>
  clearStaleTimeout: () => void
}

export interface WorkerInstance {
  running: boolean
  workerIndex: number
  stop: () => Promise<void>
  respawn: () => Promise<void>
  promise?: Promise<any>
}

export interface WorkersInstance {
  running: boolean
  workersCount: number
  workers: WorkerInstance[]
  runningJobsByName: Map<string, number>
  jobAcquisitionLock: Promise<void>
  /**
   * Stop all workers and wait for them to finish
   */
  stop: () => Promise<void>
}
