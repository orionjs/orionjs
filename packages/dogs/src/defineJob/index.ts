import {
  CreateEventJobOptions,
  CreateJobOptions,
  CreateRecurrentJobOptions,
  EventJobDefinition,
  JobDefinition,
  RecurrentJobDefinition,
} from '../types/JobsDefinition'
import {scheduleJob, ScheduleJobsResult, scheduleJobs} from '..'
import {ScheduleJobOptionsWithoutName} from '../types/Events'
import {cleanAndValidate, SchemaInAnyOrionForm} from '@orion-js/schema'
import parse from 'parse-duration'

export function createEventJob<TParamsSchema extends SchemaInAnyOrionForm>(
  options: CreateEventJobOptions<TParamsSchema>,
): EventJobDefinition<TParamsSchema> {
  const jobDefinition: EventJobDefinition<TParamsSchema> = {
    ...options,
    type: 'event',
    schedule: null,
    scheduleJobs: null,
  }

  jobDefinition.schedule = async (scheduleOptions: ScheduleJobOptionsWithoutName<TParamsSchema>) => {
    if (!jobDefinition.jobName) {
      throw new Error('This job has not been registered in the workers')
    }

    const params = jobDefinition.params
      ? await cleanAndValidate(jobDefinition.params, scheduleOptions.params)
      : scheduleOptions.params

    return await scheduleJob({
      ...scheduleOptions,
      name: jobDefinition.jobName,
      params,
    })
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

    return await scheduleJobs(processedJobs)
  }

  return jobDefinition
}

export function createRecurrentJob(options: CreateRecurrentJobOptions): RecurrentJobDefinition {
  const jobDefinition: RecurrentJobDefinition = {
    ...options,
    priority: options.priority ?? 100,
    type: 'recurrent',
    runEvery: typeof options.runEvery === 'string' ? parse(options.runEvery) : options.runEvery,
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
