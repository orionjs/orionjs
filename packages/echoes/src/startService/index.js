import {Kafka} from 'kafkajs'
import config from '../config'

export default async function (options) {
  const kafka = new Kafka(options.client)

  config.producer = kafka.producer(options.producer)
  config.consumer = kafka.consumer(options.consumer)

  await config.producer.connect()
  await config.consumer.connect()

  for (const topic in options.echoes) {
    await config.consumer.subscribe({topic})
  }

  await config.consumer.run({
    eachMessage: async params => {
      const echo = options.echoes[params.topic]
      if (!echo) return
      await echo.onMessage(params)
    }
  })
}
