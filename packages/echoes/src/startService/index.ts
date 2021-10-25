import {EachMessagePayload, Kafka} from 'kafkajs'
import config from '../config'
import requestsHandler from '../requestsHandler'
import types from '../echo/types'
import {EchoesOptions} from '../options'

export default function (options: EchoesOptions) {
  const kafka = new Kafka(options.client)

  config.producer = kafka.producer(options.producer)
  config.consumer = kafka.consumer(options.consumer)

  config.producer.connect()
  config.consumer.connect()

  for (const topic in options.echoes) {
    const echo = options.echoes[topic]
    if (echo.type !== types.event) continue

    config.consumer.subscribe({topic})
  }

  config.consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const echo = options.echoes[payload.topic]
      if (!echo) return
      if (echo.type !== types.event) return
      await echo.onMessage(payload)
    }
  })

  if (options.requests) {
    config.requests = options.requests

    config.echoes = options.echoes
    if (config.requests.startHandler) {
      config.requests.startHandler(requestsHandler)
    }
  }
}
