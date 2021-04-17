import {Kafka} from 'kafkajs'
import config from '../config'
import replyEcho from '../request/replyEcho'

export default async function (options) {
  const kafka = new Kafka({
    clientId: options.clientId,
    brokers: options.brokers,
    ...options.clientOptions
  })

  config.producer = kafka.producer()
  config.consumer = kafka.consumer({groupId: options.namespace})

  await config.producer.connect()
  await config.consumer.connect()

  const replyTo = `reply_${config.serverId}`
  options.echoes[replyTo] = replyEcho

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
