import type { Blackbox } from '@orion-js/schema'
import {Prop, TypedSchema} from '@orion-js/typed-model'

@TypedSchema()
export class HistoryRecord {
  @Prop()
  _id: string

  @Prop()
  jobId: string

  @Prop()
  executionId: string

  @Prop()
  jobName: string

  @Prop()
  type: 'recurrent' | 'event'

  @Prop()
  priority: number

  @Prop()
  tries: number

  @Prop({optional: true})
  uniqueIdentifier?: string

  @Prop()
  startedAt: Date

  @Prop()
  endedAt: Date

  @Prop()
  duration: number

  @Prop({optional: true})
  expiresAt?: Date

  @Prop()
  status: 'success' | 'error' | 'stale'

  @Prop({optional: true})
  errorMessage?: string

  @Prop({type: 'blackbox', optional: true})
  params?: Blackbox

  @Prop({type: 'blackbox', optional: true})
  result?: Blackbox
}
