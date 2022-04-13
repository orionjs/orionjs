import {OrionLogger} from '@orion-js/logger'
import {PlainObject} from './HistoryRecord'
import {JobDefinition} from './JobsDefinition'

export interface JobToRun {
  jobId: string
  executionId: string
  name: string
  type: 'event' | 'recurrent'
  params: PlainObject
  tries: number
  lockTime: number
  priority: number
  uniqueIdentifier?: string
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
  /**
   * Stop all workers and wait for them to finish
   */
  stop: () => Promise<void>
}
