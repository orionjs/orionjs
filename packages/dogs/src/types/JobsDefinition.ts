import {ExecutionContext} from './Worker'

export interface BaseJobDefinition {
  /**
   * The name of the job. Defined globally across all the mongo ecosystem
   */
  name: string

  /**
   * The function to execute when the job is executed.
   */
  resolve: (params: any, context: ExecutionContext) => Promise<void>

  /**
   * The priority of the job.
   */
  priority?: number
}

export interface RecurrentJobDefinition extends BaseJobDefinition {
  /**
   * Type of the job.
   */
  type: 'recurrent'

  /**
   * A function executed after each execution that returns the date of the next run.
   */
  getNextRun?: () => Date

  /**
   * Run every x milliseconds. This will be ignored if getNextRun is defined.
   */
  runEvery?: number
}

export interface EventJobDefinition extends BaseJobDefinition {
  /**
   * Type of the job.
   */
  type: 'event'
}

export type JobDefinition = RecurrentJobDefinition | EventJobDefinition

export interface JobsDefinition {
  [jobName: string]: JobDefinition
}
