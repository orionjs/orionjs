import {ConsumerConfig, KafkaConfig, ProducerConfig, Consumer, Producer} from 'kafkajs'

interface EchoConfig {
  type: 'event' | 'request'
  resolve: (params: any, context?: any) => Promise<any>
}

interface Echo extends EchoConfig {
  onMessage: (messageData: EachMessagePayload) => Promise<void>
  onRequest: (serializedParams: string) => any
}

interface PublishOptions {
  topic: string
  params: any
  acks?: number
  timeout?: number
}

interface RequestOptions {
  method: string
  service: string
  params: any
}

interface RequestHandlerResponse {
  result?: any
  error?: any
}

interface RequestsHandlerParams {
  getBodyJSON: () => Promise<any>
}

interface RequestsConfig {
  key: string
  startHandler: (handler: (params: HandlerParams) => Promise<RequestHandlerResponse>) => any
  services: {
    [string]: string
  }
}

interface EchoesOptions {
  client: KafkaConfig
  producer: ProducerConfig
  consumer: ConsumerConfig
  requests: RequestsConfig
  echoes: {
    [string]: Echo
  }
}

interface EchoesConfigHandler {
  producer?: Producer
  consumer?: Consumer
  requests?: RequestsConfig
  echoes?: {
    [string]: Echo
  }
}
