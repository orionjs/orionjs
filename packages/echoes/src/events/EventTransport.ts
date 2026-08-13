import type {EchoesEventTransportName, EchoesReceivedEvent, PublishOptions} from '../types'

export interface EventSubscriptionDefinition {
  topic: string
  attemptsBeforeDeadLetter?: number
  ordered?: boolean
  configVersion?: number
  executionVersion?: 1 | 2
}

export interface EventTransportStartOptions {
  consume: boolean
  publish: boolean
  subscriptions: EventSubscriptionDefinition[]
  onEvent(event: EchoesReceivedEvent): Promise<void>
}

export interface EventTransport {
  readonly name: EchoesEventTransportName
  start(options: EventTransportStartOptions): Promise<void>
  publish<TParams = any>(options: PublishOptions<TParams>): Promise<any>
  close(): Promise<void>
}
