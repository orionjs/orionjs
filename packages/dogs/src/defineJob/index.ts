import {
  CreateEventJobOptions,
  CreateJobOptions,
  CreateRecurrentJobOptions,
  EventJobDefinition,
  JobDefinition,
  RecurrentJobDefinition,
} from '../types/JobsDefinition'
import {scheduleJob, ScheduleJobOptions} from '..'
import {cleanAndValidate, SchemaInAnyOrionForm} from '@orion-js/schema'
import parse from 'parse-duration'

export function createEventJob<TParamsSchema extends SchemaInAnyOrionForm>(
  options: CreateEventJobOptions<TParamsSchema>,
): EventJobDefinition<TParamsSchema> {
  const jobDefinition: EventJobDefinition<TParamsSchema> = {
    ...options,
    type: 'event',
    schedule: null,
  }

  jobDefinition.schedule = async (
    scheduleOptions: Omit<ScheduleJobOptions<TParamsSchema>, 'name'>,
  ) => {
    if (!jobDefinition.jobName) {
      throw new Error('This job has not been registered in the workers')
    }

    const params: any = jobDefinition.params
      ? await cleanAndValidate(jobDefinition.params, scheduleOptions.params)
      : scheduleOptions.params

    return await scheduleJob({
      ...scheduleOptions,
      name: jobDefinition.jobName,
      params,
    })
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
