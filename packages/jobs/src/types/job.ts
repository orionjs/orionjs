import {Job as AgendaJob} from 'agenda/es'

export interface Job {
  /**
   * The type of the job.
   * "recurrent": The job should be ran every X time.
   * "event": The job should be ran when an event is triggered.
   */
  type: 'recurrent' | 'event'

  run: RunFunction

  /**
   * A function that returns the date when the job should be executed.
   */
  getNextRun?: () => Date

  /**
   * If number, number of milliseconds between each time the job gets ran.
   * If string, it can be a human-readable format string (e.g. "5 minutes"), or a cron format string (e.g. "0 0/5 * * * *").
   */
  runEvery?: number | string

  /**
   * Wether to save results in the db or not. Defaults to false.
   */
  persistResult?: boolean

  /**
   * The max numbers an event-type job will be retried on failure. Defaults to 0.
   */
  maxRetries?: number

  /**
   * Maximum number of that job that can be running at once.
   */
  concurrency?: number

  /**
   *  Maximum number of that job that can be locked at once.
   */
  lockLimit?: number

  /**
   * Interval in ms of how long the job stays locked for (see multiple job processors for more info).
   * A job will automatically unlock once a returned promise resolves/rejects.
   */
  lockLifetime?: number

  /**
   * Specifies the priority of the job. Higher priority jobs will run first.
   */
  priority?: 'lowest' | 'low' | 'normal' | 'high' | 'highest' | number

  /**
   * Flag that specifies whether the result of the job should also be stored in the database. Defaults to false.
   */
  shouldSaveResult?: boolean

  /**
   * The name of the job. Useful for readability when browsing jobs.
   * Defaults to the name given on the JobMap object on init (only for recurring jobs).
   * Event jobs will have a random id as name unless this prop is defined.
   */
  name?: string
}

export interface JobMap {
  [key: string]: Job
}

export interface JobInfo extends AgendaJob {
  /**
   * For an event-type job, the number of retries executed.
   */
  timesExecuted: number
}

export type RunFunction = (data: any, job: JobInfo) => Promise<void>

export type TriggerEventTypeJob = (data: any) => Promise<AgendaJob>
