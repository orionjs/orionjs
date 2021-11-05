import {
  ConsumerConfig,
  KafkaConfig,
  ProducerConfig,
  Consumer,
  Producer,
  EachMessagePayload
} from 'kafkajs'

export interface EchoConfig {
  type: 'event' | 'request'
  resolve(params: any, context?: any): Promise<any>
}

export interface Echo extends EchoConfig {
  onMessage(messageData: EachMessagePayload): Promise<void>
  onRequest(serializedParams: string): any
}

export interface PublishOptions {
  topic: string
  params: any
  acks?: number
  timeout?: number
}

export interface RequestOptions {
  method: string
  service: string
  params: any
}

export interface RequestHandlerResponse {
  result?: any
  error?: any
}

export interface MakeRequestParams {
  url: string
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
   * The secret key used to sign all requests
   */
  key: string
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

export interface EchoesOptions {
  client?: KafkaConfig
  producer?: ProducerConfig
  consumer?: ConsumerConfig
  requests?: RequestsConfig
  echoes: {
    [key: string]: Echo
  }
}

export interface EchoesConfigHandler {
  producer?: Producer
  consumer?: Consumer
  requests?: RequestsConfig
  echoes?: {
    [key: string]: Echo
  }
}
