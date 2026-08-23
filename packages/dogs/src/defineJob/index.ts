import {cleanAndValidate, SchemaInAnyOrionForm} from '@orion-js/schema'
import {CronExpressionParser} from 'cron-parser'
import parse from 'parse-duration'
import {ScheduleJobsResult} from '..'
import {scheduleJobInternal, scheduleJobsInternal} from '../schedule'
import {ScheduleJobOptionsWithoutName} from '../types/Events'
import {
  CreateEventJobOptions,
  CreateJobOptions,
  CreateRecurrentJobOptions,
  EventJobDefinition,
  JobDefinition,
  RecurrentJobDefinition,
} from '../types/JobsDefinition'

export function createEventJob<TParamsSchema extends SchemaInAnyOrionForm>(
  options: CreateEventJobOptions<TParamsSchema>,
): EventJobDefinition<TParamsSchema> {
  const jobDefinition: EventJobDefinition<TParamsSchema> = {
    ...options,
    type: 'event',
    schedule: null,
    scheduleJobs: null,
  }

  jobDefinition.schedule = async (
    scheduleOptions: ScheduleJobOptionsWithoutName<TParamsSchema>,
  ) => {
    if (!jobDefinition.jobName) {
      throw new Error('This job has not been registered in the workers')
    }

    const params = jobDefinition.params
      ? await cleanAndValidate(jobDefinition.params, scheduleOptions.params)
      : scheduleOptions.params

    return await scheduleJobInternal(
      {
        ...scheduleOptions,
        name: jobDefinition.jobName,
        params,
      },
      jobDefinition.nPartitions,
    )
  }

  jobDefinition.scheduleJobs = async (
    jobs: Array<ScheduleJobOptionsWithoutName<TParamsSchema>>,
  ): Promise<ScheduleJobsResult> => {
    if (!jobDefinition.jobName) {
      throw new Error('This job has not been registered in the workers')
    }

    // Process all job parameters if schema validation is needed
    const processedJobs = await Promise.all(
      jobs.map(async scheduleOptions => {
        const params = jobDefinition.params
          ? await cleanAndValidate(jobDefinition.params, scheduleOptions.params)
          : scheduleOptions.params

        return {
          ...scheduleOptions,
          name: jobDefinition.jobName,
          params,
        }
      }),
    )

    return await scheduleJobsInternal(processedJobs, jobDefinition.nPartitions)
  }

  return jobDefinition
}

export function createRecurrentJob(options: CreateRecurrentJobOptions): RecurrentJobDefinition {
  const recurrentOptions = {
    ...options,
  } as CreateRecurrentJobOptions & {maxTries?: number}

  delete recurrentOptions.maxTries

  if ('cron' in recurrentOptions && recurrentOptions.cron && !recurrentOptions.timezone) {
    throw new Error('Cron recurrent jobs require a timezone')
  }

  if ('cron' in recurrentOptions && recurrentOptions.cron) {
    CronExpressionParser.parse(recurrentOptions.cron, {tz: recurrentOptions.timezone}).next()
  }

  const runEvery =
    'runEvery' in recurrentOptions
      ? typeof recurrentOptions.runEvery === 'string'
        ? parse(recurrentOptions.runEvery)
        : recurrentOptions.runEvery
      : undefined

  const jobDefinition: RecurrentJobDefinition = {
    ...recurrentOptions,
    priority: recurrentOptions.priority ?? 100,
    type: 'recurrent',
    runEvery,
  }

  return jobDefinition
}

/**
 * @deprecated Use `createEventJob` or `createRecurrentJob` instead.
 */
export const defineJob = (
  options: CreateJobOptions & {type: 'event' | 'recurrent'},
): JobDefinition => {
  return options.type === 'event'
    ? createEventJob(options as any)
    : createRecurrentJob(options as any)
}
