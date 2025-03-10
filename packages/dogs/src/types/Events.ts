import { Blackbox } from '@orion-js/schema'

export interface ScheduleJobOptionsBase {
  name: string
  params?: Blackbox
  priority?: number
  uniqueIdentifier?: string
}

export type ScheduleJobOptionsRunIn = ScheduleJobOptionsBase & {
  runIn: number
}

export type ScheduleJobOptionsRunAt = ScheduleJobOptionsBase & {
  runAt: Date
}

export type ScheduleJobOptions =
  | ScheduleJobOptionsRunIn
  | ScheduleJobOptionsRunAt
  | ScheduleJobOptionsBase

export interface ScheduleJobRecordOptions {
  name: string
  params: Blackbox
  nextRunAt: Date
  priority: number
  uniqueIdentifier?: string
}
