import {EachMessagePayload, Kafka} from 'kafkajs'
import config from '../config'
import requestsHandler from '../requestsHandler'
import types from '../echo/types'
import {EchoesOptions} from '../types'
import {registerRoute} from '@orion-js/http'

export default async function startService(options: EchoesOptions) {
  config.echoes = options.echoes

  if (options.requests) {
    config.requests = options.requests
    registerRoute(requestsHandler(options))
  }

  if (options.client) {
    const kafka = new Kafka(options.client)

    config.producer = kafka.producer(options.producer)
    config.consumer = kafka.consumer(options.consumer)

    await config.producer.connect()
    await config.consumer.connect()

    for (const topic in options.echoes) {
      const echo = options.echoes[topic]
      if (echo.type !== types.event) continue

      await config.consumer.subscribe({
        topic,
        fromBeginning: options.readTopicsFromBeginning ?? false
      })
    }

    config.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const echo = options.echoes[payload.topic]
        if (!echo) return
        if (echo.type !== types.event) return
        await echo.onMessage(payload)
      }
    })
  }
}
