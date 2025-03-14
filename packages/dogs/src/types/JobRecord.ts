import {createEnum, InferSchemaType, schemaWithName} from '@orion-js/schema'

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
})

export type JobRecord = InferSchemaType<typeof JobRecordSchema>
