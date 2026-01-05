import {JobsDefinition} from './JobsDefinition'
import {JobToRun} from './Worker'

export type LogLevels = 'debug' | 'info' | 'warn' | 'error' | 'none'

export interface StartWorkersConfig {
  /**
   * Object map of the jobs that this workers will execute
   */
  jobs: JobsDefinition
  /**
   * Maximum number of tries for a job before it is marked as 'maxTriesReached'.
   * This is a required global default that can be overridden per job definition.
   */
  maxTries: number
  /**
   * Callback invoked when a job reaches its maximum tries limit.
   * Use this to notify administrators (e.g., send an email alert).
   * The job will remain in the database with status 'maxTriesReached'.
   */
  onMaxTriesReached: (job: JobToRun) => Promise<void>
  /**
   * Time in milliseconds to wait between each look without results for a job
   * to run at the database. Default is 3000.
   */
  pollInterval?: number
  /**
   * Time in milliseconds to wait too look for a job after a job execution. Default is 100.
   */
  cooldownPeriod?: number
  /**
   * Number of workers to start. Default is 1.
   */
  workersCount?: number
  /**
   * Default time in milliseconds to lock a job for execution. Default is 30000 (30 seconds).
   * If a job is locked for longer than this time, it will be considered as failed.
   * This is to prevent a job from being executed multiple times at the same time.
   * You can extend this time inside a job by calling extendLockTime from context.
   * Individual jobs can override this value by setting their own lockTime.
   */
  defaultLockTime?: number
}
