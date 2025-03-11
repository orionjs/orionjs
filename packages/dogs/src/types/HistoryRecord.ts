import type { Blackbox } from '@orion-js/schema'
import { Prop, TypedSchema } from '@orion-js/typed-model'

@TypedSchema()
export class HistoryRecord {
  @Prop({ type: String })
  _id: string

  @Prop({ type: String })
  jobId: string

  @Prop({ type: String })
  executionId: string

  @Prop({ type: String })
  jobName: string

  @Prop({ type: String })
  type: 'recurrent' | 'event'

  @Prop({ type: Number })
  priority: number

  @Prop({ type: Number })
  tries: number

  @Prop({ type: String, optional: true })
  uniqueIdentifier?: string

  @Prop({ type: Date })
  startedAt: Date

  @Prop({ type: Date })
  endedAt: Date

  @Prop({ type: Number })
  duration: number

  @Prop({ type: Date, optional: true })
  expiresAt?: Date

  @Prop({ type: String })
  status: 'success' | 'error' | 'stale'

  @Prop({ type: String, optional: true })
  errorMessage?: string

  @Prop({ type: 'blackbox', optional: true })
  params?: Blackbox

  @Prop({ type: 'blackbox', optional: true })
  result?: Blackbox
}
