import {Blackbox, InferSchemaType, SchemaInAnyOrionForm} from '@orion-js/schema'

/**
 * Base type for schedule params that varies based on schema presence
 */
type ScheduleJobParamsType<TParamsSchema extends SchemaInAnyOrionForm> =
  TParamsSchema extends undefined ? {params?: Blackbox} : {params: InferSchemaType<TParamsSchema>}

/**
 * Common options shared by all schedule job variants (without name)
 */
type ScheduleJobCommonOptions = {
  priority?: number
  uniqueIdentifier?: string
}

/**
 * Schedule options without name - used by job definition's schedule method.
 * This is a distributive type that properly handles runIn/runAt variants.
 */
export type ScheduleJobOptionsWithoutName<TParamsSchema extends SchemaInAnyOrionForm = any> =
  | (ScheduleJobCommonOptions & ScheduleJobParamsType<TParamsSchema> & {runIn: number})
  | (ScheduleJobCommonOptions & ScheduleJobParamsType<TParamsSchema> & {runAt: Date})
  | (ScheduleJobCommonOptions & ScheduleJobParamsType<TParamsSchema>)

/**
 * Full schedule options including job name - used by direct scheduleJob calls
 */
export type ScheduleJobOptions<TParamsSchema extends SchemaInAnyOrionForm = any> =
  ScheduleJobOptionsWithoutName<TParamsSchema> & {name: string}

/**
 * Legacy type aliases for backwards compatibility
 */
export type ScheduleJobOptionsBase<TParamsSchema extends SchemaInAnyOrionForm> = {
  name: string
  priority?: number
  uniqueIdentifier?: string
} & ScheduleJobParamsType<TParamsSchema>

export type ScheduleJobOptionsRunIn<TParamsSchema extends SchemaInAnyOrionForm> =
  ScheduleJobOptionsBase<TParamsSchema> & {runIn: number}

export type ScheduleJobOptionsRunAt<TParamsSchema extends SchemaInAnyOrionForm> =
  ScheduleJobOptionsBase<TParamsSchema> & {runAt: Date}

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
