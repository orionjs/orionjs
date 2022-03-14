import {Prop, TypedModel} from '@orion-js/typed-model'

export type PlainObject = {[name: string]: any}

@TypedModel()
export class HistoryRecord {
  @Prop()
  _id: string

  @Prop()
  executionId: string

  @Prop()
  jobName: string

  @Prop()
  isRecurrent: boolean

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
  params?: PlainObject

  @Prop({type: 'blackbox', optional: true})
  result?: PlainObject
}
