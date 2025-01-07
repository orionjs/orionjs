import { Kafka } from 'kafkajs'
import config from '../config'
import requestsHandler from '../requestsHandler'
import types from '../echo/types'

const HEARTBEAT_INTERVAL_SECONDS = 3

export default async function startService(options) {
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
        fromBeginning: options.readTopicsFromBeginning || false,
      })
    }

    config.consumer.run({
      eachMessage: async params => {
        const echo = options.echoes[params.topic]
        if (!echo) return
        if (echo.type !== types.event) return
        let intervalsCount = 0
        const interval = setInterval(async () => {
          await params.heartbeat().catch(error => {
            console.warn('Echoes: Error sending heartbeat:', error)
          })
          intervalsCount++
          if (intervalsCount % 10 === 0) {
            console.warn(`Echoes: Event ${params.topic} is taking too long to process: ${intervalsCount * HEARTBEAT_INTERVAL_SECONDS}s`)
          }
        }, HEARTBEAT_INTERVAL_SECONDS * 1000)
        await echo.onMessage(params).catch(error => {
          clearInterval(interval)
          throw error
        })
        clearInterval(interval)
      },
    })
  }
  if (options.requests) {
    config.requests = options.requests

    config.echoes = options.echoes
    if (config.requests.startHandler) {
      config.requests.startHandler(requestsHandler)
    }
  }
}
