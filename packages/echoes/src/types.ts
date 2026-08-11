import type {EchoesRequestHandlerRegistrar} from './runtime'
import type {EchoesSchema, InferEchoesSchema} from './schema'

export interface EchoRequestConfig<
  TParamsSchema extends EchoesSchema,
  TReturnsSchema extends EchoesSchema,
> {
  params?: TParamsSchema
  returns?: TReturnsSchema
  resolve(
    params?: InferEchoesSchema<TParamsSchema>,
    context?: any,
  ): Promise<InferEchoesSchema<TReturnsSchema>>
  attemptsBeforeDeadLetter?: number
}

export interface EchoEventConfig<
  TParamsSchema extends EchoesSchema,
  TReturnsSchema extends EchoesSchema,
> {
  params?: TParamsSchema
  returns?: TReturnsSchema
  /**
   * Pulse only. Overrides events.pulse.subscription.ordered for this topic listener.
   */
  ordered?: boolean
  resolve(
    params?: InferEchoesSchema<TParamsSchema>,
    context?: any,
  ): Promise<InferEchoesSchema<TReturnsSchema>>
  attemptsBeforeDeadLetter?: number
}

export type EchoConfig<
  TParamsSchema extends EchoesSchema,
  TReturnsSchema extends EchoesSchema,
  TEchoType extends 'event' | 'request' = 'event' | 'request',
> = (TEchoType extends 'event'
  ? EchoEventConfig<TParamsSchema, TReturnsSchema>
  : EchoRequestConfig<TParamsSchema, TReturnsSchema>) & {
  type: TEchoType
}

export type EchoType<
  TParamsSchema extends EchoesSchema = any,
  TReturnsSchema extends EchoesSchema = any,
  TEchoType extends 'event' | 'request' = 'event' | 'request',
> = {
  params?: TParamsSchema
  returns?: TReturnsSchema
  attemptsBeforeDeadLetter?: number
  ordered?: boolean
  type: TEchoType
  resolve(
    params?: InferEchoesSchema<TParamsSchema>,
    context?: any,
  ): Promise<InferEchoesSchema<TReturnsSchema>>
  onEvent?(event: EchoesReceivedEvent): Promise<void>
  /**
   * @deprecated Kafka compatibility entrypoint. Event transports use onEvent.
   */
  onMessage(messageData: EchoesKafkaMessagePayload): Promise<void>
  onRequest(serializedParams: string): any
}

export type EchoesEventTransportName = 'kafka' | 'pulse'

export interface EchoesEventPayload<TParams = any> {
  params: TParams
}

export interface EchoesReceivedEvent<TParams = any> {
  id: string
  topic: string
  data: EchoesEventPayload<TParams>
  transport: EchoesEventTransportName
  headers?: Record<string, unknown>
  createdAt: Date
  attempt: number
  context?: Record<string, any>
}

export interface PublishOptions<TParams = any> {
  topic: string
  params: TParams
  acks?: number
  timeout?: number
}

export interface RequestOptions<TParams> {
  method: string
  service: string
  params: TParams
  retries?: number
  timeout?: number
}

export interface RequestHandlerResponse {
  result?: any
  error?: any
  isUserError?: boolean
  isValidationError?: boolean
  errorInfo?: {
    error: string // 'validationError',
    message: string // 'Validation Error',
    extra?: any // this.extra
    validationErrors?: any // this.validationErrors
    labels?: Record<string, string>
  }
}

export interface MakeRequestParams {
  url: string
  retries?: number
  timeout?: number
  data: {
    body: object
    signature: string
  }
}

export interface RequestMakerResult {
  statusCode: number
  data: object
}

export type RequestMaker = (options: MakeRequestParams) => Promise<RequestMakerResult>

export interface RequestsConfig {
  /**
   * The secret key used to sign all requests. Shared between all your services.
   * You can also set the env var echoes_password or process.env.ECHOES_PASSWORD
   */
  key?: string
  /**
   * The path of the echoes http receiver. Defaults to /echoes-services
   */
  handlerPath?: string
  /**
   * Map of all the services that have echoes requests handlers
   */
  services?: {
    [key: string]: string
  }
  /**
   * A custom function that makes requests to the services.
   */
  makeRequest?: RequestMaker
  /**
   * Registers the HTTP receiver in standalone servers. Orion applications get
   * this from @orion-js/echoes-orion automatically.
   */
  registerHandler?: EchoesRequestHandlerRegistrar
}

export interface EchoesMap {
  [key: string]: EchoType<any, any>
}

export interface EchoesKafkaClientConfig {
  brokers: string[]
  clientId?: string
  [key: string]: unknown
}

export interface EchoesKafkaProducerConfig {
  [key: string]: unknown
}

export interface EchoesKafkaConsumerConfig {
  groupId?: string
  [key: string]: unknown
}

export interface EchoesKafkaMessagePayload {
  topic: string
  partition: number
  message: {
    value: {toString(): string} | null
    offset: string
    timestamp?: string
    headers?: Record<string, any>
  }
  heartbeat(): Promise<void>
}

export interface EchoesKafkaEventsConfig {
  client: EchoesKafkaClientConfig
  producer?: EchoesKafkaProducerConfig
  consumer?: EchoesKafkaConsumerConfig
  /**
   * Defaults to true. When true, allows a reconnecting service to read missed messages.
   */
  readTopicsFromBeginning?: boolean
  /**
   * Defaults to 4.
   */
  partitionsConsumedConcurrently?: number
  /**
   * Defaults to 1.
   */
  membersToPartitionsRatio?: number
}

export interface EchoesPulseEventsConfig {
  connectionString: string
  consumerGroup: string
  databaseName?: string
  collectionPrefix?: string
  eventRetentionMs?: number | null
  historyRetentionMs?: number | null
  pollIntervalMs?: number
  workerCount?: number
  maxPoolSize?: number
  lockTimeoutMs?: number
  discoveryLockTimeoutMs?: number
  onError?: (error: Error) => void
  /**
   * Subscription defaults used by every Echoes event handled through Pulse.
   * Event-level ordered and attemptsBeforeDeadLetter override ordered and maxRetries
   * respectively when configured.
   */
  subscription?: {
    ordered?: boolean
    offsetReset?: 'latest' | 'earliest'
    delivery?: 'at-least-once' | 'at-most-once'
    maxRetries?: number
    retryDelayMs?: number
    retryBackoffMultiplier?: number
    maxConcurrency?: number
  }
}

export interface EchoesEventsConfig {
  kafka?: EchoesKafkaEventsConfig
  pulse?: EchoesPulseEventsConfig
  /**
   * Event transports that execute listeners. Defaults to Kafka when configured,
   * otherwise Pulse.
   */
  consumeFrom?: EchoesEventTransportName[]
  /**
   * The only transport used by publish(). Defaults to Kafka when configured,
   * otherwise Pulse.
   */
  publishTo?: EchoesEventTransportName
}

export interface EchoesOptions {
  client?: EchoesKafkaClientConfig
  producer?: EchoesKafkaProducerConfig
  consumer?: EchoesKafkaConsumerConfig
  requests?: RequestsConfig
  echoes: EchoesMap
  /**
   * Multi-transport event configuration. The legacy Kafka fields above remain supported.
   */
  events?: EchoesEventsConfig

  /**
   * Defaults to true. When true, allows a reconnecting service to read missed messages.
   */
  readTopicsFromBeginning?: boolean
  /**
   * Defaults to 4. How many partitions to consume concurrently, adjust this with the members to partitions ratio to avoid idle consumers.
   */
  partitionsConsumedConcurrently?: number
  /**
   * Defaults to 1. How many members are in comparison to partitions, this is used to determine if the consumer group has room for more members. Numbers over 1 leads to idle consumers. Numbers under 1 needs partitionsConsumedConcurrently to be more than 1.
   */
  membersToPartitionsRatio?: number
}

export interface EchoesConfigHandler {
  requests?: RequestsConfig
  echoes?: EchoesMap
  eventBus?: {
    publish<TParams = any>(options: PublishOptions<TParams>): Promise<any>
    close(): Promise<void>
  }
}
