import {createEnum, InferSchemaType, schemaWithName} from '@orion-js/schema'

/**
 * Enum representing the status of a job record.
 * - 'pending': Job is active and can be executed (default for existing records)
 * - 'maxTriesReached': Job has exhausted all retry attempts and won't be executed
 */
export const JobStatusEnum = createEnum('JobStatus', ['pending', 'maxTriesReached'])

export const JobRecordSchema = schemaWithName('JobRecord', {
  _id: {type: 'string'},
  jobName: {type: 'string'},
  type: {type: createEnum('JobType', ['recurrent', 'event'])},
  priority: {type: 'number'},
  uniqueIdentifier: {type: 'string', optional: true},
  nextRunAt: {type: 'date'},
  lastRunAt: {type: 'date', optional: true},
  lockedUntil: {type: 'date', optional: true},
  tries: {type: 'number', optional: true},
  params: {type: 'blackbox', optional: true},
  /**
   * Status of the job. Optional for backwards compatibility with existing records.
   * Records without this field are treated as 'pending'.
   */
  status: {type: JobStatusEnum, optional: true},
})

export type JobRecord = InferSchemaType<typeof JobRecordSchema>
