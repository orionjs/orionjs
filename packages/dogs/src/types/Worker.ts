import {OrionLogger} from '@orion-js/logger'
import {Blackbox} from '@orion-js/schema'
import {JobDefinition} from './JobsDefinition'

export interface JobToRun {
  jobId: string
  executionId: string
  lockId: string
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

export interface WorkersInstance {
  running: boolean
  workersCount: number
  /**
   * Number of active executions currently consuming scheduler capacity.
   */
  readonly runningExecutions: number
  /**
   * Stop acquiring jobs and wait for active lock-owning executions to finish or become stale.
   */
  stop: () => Promise<void>
}
