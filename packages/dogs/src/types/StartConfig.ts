import {JobsDefinition} from './JobsDefinition'

export type LogLevels = 'debug' | 'info' | 'warn' | 'error'

export interface StartWorkersConfig {
  /**
   * Object map of the jobs that this workers will execute
   */
  jobs: JobsDefinition
  /**
   * Time in milliseconds to wait between each look without results for a job
   * to run at the database. Default is 3000.
   */
  pollInterval: number
  /**
   * Time in milliseconds to wait too look for a job after a job execution. Default is 100.
   */
  cooldownPeriod: number
  /**
   * Number of workers to start. Default is 1.
   */
  workersCount: number
  /**
   * Time in milliseconds to lock a job for execution. Default is 30000 (30 seconds).
   * If a job is locked for longer than this time, it will be considered as failed.
   * This is to prevent a job from being executed multiple times at the same time.
   * You can extend this time inside a job by calling extendLockTime from context.
   */
  lockTime: number
  /**
   * logLevel is the level of logging to use. Default is 'info'.
   */
  logLevel: LogLevels
}
