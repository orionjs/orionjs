import {createEnum, InferSchemaType, schemaWithName} from '@orion-js/schema'

/**
 * Enum representing the status of a job record.
 * - 'pending': Job is active and can be executed (default for existing records)
 * - 'maxTriesReached': Event job has exhausted all retry attempts and won't be executed
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
  /**
   * Identifies the execution that currently owns the lock. Mutations from an execution must match
   * this value so a stale execution cannot modify a newer claim.
   */
  lockId: {type: 'string', optional: true},
  /**
   * Internal acquisition metadata used when MongoDB supports sorted updateOne. It preserves the
   * pre-update stale state because updateOne intentionally does not return the previous document.
   */
  claimWasStale: {type: 'boolean', optional: true},
  tries: {type: 'number', optional: true},
  params: {type: 'blackbox', optional: true},
  /**
   * Status of the job. Optional for backwards compatibility with existing records.
   * Records without this field are treated as 'pending'.
   */
  status: {type: JobStatusEnum, optional: true},
  /**
   * Date when the job reached its maximum tries. Used as the stable anchor when
   * maxTriesReachedRetentionMs changes between worker restarts.
   */
  maxTriesReachedAt: {type: 'date', optional: true},
  /**
   * Date when MongoDB should remove a terminal event job through the TTL index.
   */
  expiresAt: {type: 'date', optional: true},
})

export type JobRecord = InferSchemaType<typeof JobRecordSchema>
