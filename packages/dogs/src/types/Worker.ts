import {JobDefinition} from './JobsDefinition'

export interface JobToRun {
  jobId: string
  name: string
  isRecurrent: boolean
  params: any
  tries: number
  lockTime: number
}

export interface ExecutionContext {
  record: JobToRun
  definition: JobDefinition
  tries: number
  extendLockTime: (extraTime: number) => Promise<void>
  clearStaleTimeout: () => void
}

export interface WorkersInstance {
  running: boolean
  workersCount: number
  workers: Promise<any>[]
  /**
   * Stop all workers and wait for them to finish
   */
  stop: () => Promise<void>
}
