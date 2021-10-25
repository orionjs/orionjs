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
  resolve: (params: any, context?: any) => Promise<any>
}

export interface Echo extends EchoConfig {
  onMessage: (messageData: EachMessagePayload) => Promise<void>
  onRequest: (serializedParams: string) => any
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

export interface RequestsHandlerParams {
  getBodyJSON: () => Promise<any>
}

export interface RequestsConfig {
  key: string
  startHandler: (handler: (params: RequestsHandlerParams) => Promise<RequestHandlerResponse>) => any
  services: {
    string: string
  }
}

export interface EchoesOptions {
  client: KafkaConfig
  producer: ProducerConfig
  consumer: ConsumerConfig
  requests: RequestsConfig
  echoes: {
    string: Echo
  }
}

export interface EchoesConfigHandler {
  producer?: Producer
  consumer?: Consumer
  requests?: RequestsConfig
  echoes?: {
    string: Echo
  }
}
