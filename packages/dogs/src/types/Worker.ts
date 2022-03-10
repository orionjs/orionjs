import {JobDefinition} from './JobsDefinition'

export interface JobToRun {
  jobId: string
  name: string
  params: any
}

export interface ExecutionContext {
  record: JobToRun
  definition: JobDefinition
  extendLockUntil: (lockedUntil: Date) => Promise<void>
}
