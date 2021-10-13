import {Kafka} from 'kafkajs'
import config from '../config'
import requestsHandler from '../requestsHandler'
import types from '../echo/types'

export default function (options) {
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
    eachMessage: async params => {
      const echo = options.echoes[params.topic]
      if (!echo) return
      if (echo.type !== types.event) return
      await echo.onMessage(params)
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
