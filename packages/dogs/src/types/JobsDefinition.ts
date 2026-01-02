import {Blackbox, InferSchemaType, SchemaInAnyOrionForm} from '@orion-js/schema'
import {ExecutionContext} from './Worker'
import {ScheduleJobOptionsWithoutName, ScheduleJobsResult} from './Events'

export interface JobRetryResultBase {
  action: 'retry' | 'dismiss'
}

export type JobRetryResultRunIn = JobRetryResultBase & {runIn: number}
export type JobRetryResultRunAt = JobRetryResultBase & {runAt: Date}
export type JobRetryResult = JobRetryResultRunIn | JobRetryResultRunAt | JobRetryResultBase

export interface BaseJobDefinition {
  /**
   * Called if the job fails.
   */
  onError?: (error: Error, params: Blackbox, context: ExecutionContext) => Promise<JobRetryResult>

  /**
   * Called if the job locktime is expired. The job will be executed again.
   */
  onStale?: (params: Blackbox, context: ExecutionContext) => Promise<void>

  /**
   * Save the executions of the job time in milliseconds. Default is 1 week. Set to 0 to disable.
   */
  saveExecutionsFor?: number

  /**
   * The name of the job.
   * This is set automatically when the job is passed to startWorkers.
   */
  jobName?: string

  /**
   * Time in milliseconds to lock this specific job for execution.
   * Overrides the defaultLockTime set in startWorkers config.
   * If not set, the defaultLockTime from config will be used.
   */
  lockTime?: number
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
   * The priority of the job. Higher is more priority. Default is 100.
   */
  priority?: number

  /**
   * The function to execute when the job is executed.
   */
  resolve: (_: any, context: ExecutionContext) => Promise<Blackbox | void>
}

export interface EventJobDefinition<TParamsSchema extends SchemaInAnyOrionForm = any>
  extends BaseJobDefinition {
  /**
   * Type of the job.
   */
  type: 'event'

  /**
   * Schedule of the job. Supports optional runIn (milliseconds) or runAt (Date) for delayed execution.
   */
  schedule: (options: ScheduleJobOptionsWithoutName<TParamsSchema>) => Promise<void>

  /**
   * Schedule multiple jobs at once. Each job supports optional runIn or runAt for delayed execution.
   */
  scheduleJobs: (
    jobs: Array<ScheduleJobOptionsWithoutName<TParamsSchema>>,
  ) => Promise<ScheduleJobsResult>

  /**
   * The schema of the params of the job.
   */
  params?: TParamsSchema

  /**
   * The function to execute when the job is executed.
   */
  resolve: (params: InferSchemaType<TParamsSchema>, context: ExecutionContext) => Promise<any>
}

export type CreateEventJobOptions<TParamsSchema extends SchemaInAnyOrionForm = any> = Omit<
  EventJobDefinition<TParamsSchema>,
  'type' | 'schedule' | 'scheduleJobs'
>

export type CreateRecurrentJobOptions = Omit<RecurrentJobDefinition, 'type' | 'runEvery'> & {
  /**
   * Run every x milliseconds.
   * Accepts https://github.com/jkroso/parse-duration strings.
   */
  runEvery: number | string
}

export type CreateJobOptions<TParamsSchema extends SchemaInAnyOrionForm = any> =
  | CreateEventJobOptions<TParamsSchema>
  | CreateRecurrentJobOptions

export type JobDefinition<TParamsSchema extends SchemaInAnyOrionForm = any> =
  | RecurrentJobDefinition
  | EventJobDefinition<TParamsSchema>

export type JobDefinitionWithName<TParamsSchema extends SchemaInAnyOrionForm = any> =
  JobDefinition<TParamsSchema> & {
    name: string
  }

export interface JobsDefinition {
  [jobName: string]: JobDefinition
}
