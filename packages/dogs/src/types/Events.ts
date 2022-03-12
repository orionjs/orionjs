export interface ScheduleJobOptionsBase {
  name: string
  params?: any
  priority?: number
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
  params: any
  nextRunAt: Date
  priority: number
}
