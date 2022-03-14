import {Prop, TypedModel} from '@orion-js/typed-model'
import {PlainObject} from './HistoryRecord'

@TypedModel()
export class JobRecord {
  @Prop()
  _id: string

  @Prop()
  jobName: string

  @Prop()
  type: 'recurrent' | 'event'

  @Prop()
  priority: number

  @Prop({optional: true})
  uniqueIdentifier?: string

  @Prop()
  nextRunAt: Date

  @Prop({optional: true})
  lastRunAt?: Date

  @Prop({optional: true})
  lockedUntil?: Date

  @Prop({optional: true})
  tries?: number

  @Prop({type: 'blackbox', optional: true})
  params?: PlainObject
}
