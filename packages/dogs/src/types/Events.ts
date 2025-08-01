import {Blackbox, InferSchemaType, SchemaInAnyOrionForm} from '@orion-js/schema'

export type ScheduleJobOptionsBase<TParamsSchema extends SchemaInAnyOrionForm> = {
  name: string
  priority?: number
  uniqueIdentifier?: string
} & (TParamsSchema extends undefined
  ? {params?: Blackbox}
  : {params: InferSchemaType<TParamsSchema>})

export type ScheduleJobOptionsRunIn<TParamsSchema extends SchemaInAnyOrionForm> =
  ScheduleJobOptionsBase<TParamsSchema> & {
    runIn: number
  }

export type ScheduleJobOptionsRunAt<TParamsSchema extends SchemaInAnyOrionForm> =
  ScheduleJobOptionsBase<TParamsSchema> & {
    runAt: Date
  }

export type ScheduleJobOptions<TParamsSchema extends SchemaInAnyOrionForm = any> =
  | ScheduleJobOptionsRunIn<TParamsSchema>
  | ScheduleJobOptionsRunAt<TParamsSchema>
  | ScheduleJobOptionsBase<TParamsSchema>

export interface ScheduleJobRecordOptions {
  name: string
  params: Blackbox
  nextRunAt: Date
  priority: number
  uniqueIdentifier?: string
}

export type ScheduleJobsOptions<TParamsSchema extends SchemaInAnyOrionForm = any> =
  ScheduleJobOptions<TParamsSchema>[]

export interface ScheduleJobsResult {
  scheduledCount: number
  skippedCount: number
  errors: Array<{
    index: number
    error: Error
    job: ScheduleJobOptions
  }>
}
