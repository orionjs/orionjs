import {InferSchemaType, schemaWithName} from '@orion-js/schema'

export const HistoryRecordSchema = schemaWithName('HistoryRecord', {
  _id: {type: 'string'},
  jobId: {type: 'string'},
  executionId: {type: 'string'},
  jobName: {type: 'string'},
  type: {type: 'string'},
  priority: {type: 'number'},
  tries: {type: 'number'},
  uniqueIdentifier: {type: 'string', optional: true},
  startedAt: {type: 'date'},
  endedAt: {type: 'date'},
  duration: {type: 'number'},
  expiresAt: {type: 'date', optional: true},
  status: {type: 'string', enum: ['success', 'error', 'stale']},
  errorMessage: {type: 'string', optional: true},
  params: {type: 'blackbox', optional: true},
  result: {type: 'any', optional: true},
})

export type HistoryRecord = InferSchemaType<typeof HistoryRecordSchema>
