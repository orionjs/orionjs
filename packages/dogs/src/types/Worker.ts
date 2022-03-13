import {JobDefinition} from './JobsDefinition'

export interface JobToRun {
  jobId: string
  name: string
  isRecurrent: boolean
  params: any
  tries: number
}

export interface ExecutionContext {
  record: JobToRun
  definition: JobDefinition
  tries: number
  extendLockUntil: (lockedUntil: Date) => Promise<void>
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
