import {ExecutionContext} from './Worker'

export interface BaseJobDefinition {
  /**
   * The function to execute when the job is executed.
   */
  resolve: (params: any, context: ExecutionContext) => Promise<void>
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

  /**
   * The priority of the job. Higher is more priority. Default is 1.
   */
  priority?: number
}

export interface EventJobDefinition extends BaseJobDefinition {
  /**
   * Type of the job.
   */
  type: 'event'
}

export type JobDefinition = RecurrentJobDefinition | EventJobDefinition

export type JobDefinitionWithName = JobDefinition & {
  name: string
}

export interface JobsDefinition {
  [jobName: string]: JobDefinition
}
