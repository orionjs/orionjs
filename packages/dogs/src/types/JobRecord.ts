import { Prop, TypedSchema } from '@orion-js/typed-model'

@TypedSchema()
export class JobRecord {
  @Prop({ type: String })
  _id: string

  @Prop({ type: String })
  jobName: string

  @Prop({ type: String })
  type: 'recurrent' | 'event'

  @Prop({ type: Number })
  priority: number

  @Prop({ type: String, optional: true })
  uniqueIdentifier?: string

  @Prop({ type: Date })
  nextRunAt: Date

  @Prop({ type: Date, optional: true })
  lastRunAt?: Date

  @Prop({ type: Date, optional: true })
  lockedUntil?: Date

  @Prop({ type: Number, optional: true })
  tries?: number

  @Prop({ type: 'blackbox', optional: true })
  params?: any
}
