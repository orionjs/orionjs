import {JobDefinition} from './JobsDefinition'

export interface JobToRun {
  jobId: string
  name: string
  isRecurrent: boolean
  params: any
}

export interface ExecutionContext {
  record: JobToRun
  definition: JobDefinition
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

export interface ScheduleJobOptions {
  name: string
}
