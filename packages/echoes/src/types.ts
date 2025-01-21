import {
  ConsumerConfig,
  KafkaConfig,
  ProducerConfig,
  Consumer,
  Producer,
  EachMessagePayload,
} from 'kafkajs'

export interface EchoConfig {
  type: 'event' | 'request'
  resolve(params: any, context?: any): Promise<any>
  attemptsBeforeDeadLetter?: number
}

export interface EchoType extends EchoConfig {
  onMessage(messageData: EachMessagePayload): Promise<void>
  onRequest(serializedParams: string): any
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
   * A custom function that make the requests to the services. Uses axios by default
   */
  makeRequest?: RequestMaker
}

export interface EchoesMap {
  [key: string]: EchoType
}

export interface EchoesOptions {
  client?: KafkaConfig
  producer?: ProducerConfig
  consumer?: ConsumerConfig
  requests?: RequestsConfig
  echoes: EchoesMap

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
  producer?: Producer
  consumer?: Consumer
  requests?: RequestsConfig
  echoes?: EchoesMap
}
