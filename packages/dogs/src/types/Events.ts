import {PlainObject} from './HistoryRecord'

export interface ScheduleJobOptionsBase {
  name: string
  params?: PlainObject
  priority?: number
  uniqueIdentifier?: string
}

export type ScheduleJobOptionsRunIn = ScheduleJobOptionsBase & {
  runIn: number
}

export type ScheduleJobOptionsRunAt = ScheduleJobOptionsBase & {
  runAt: Date
}

export type ScheduleJobOptions = ScheduleJobOptionsRunIn | ScheduleJobOptionsRunAt

export interface ScheduleJobRecordOptions {
  name: string
  params: PlainObject
  nextRunAt: Date
  priority: number
  uniqueIdentifier?: string
}
