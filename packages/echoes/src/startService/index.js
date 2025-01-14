import { AssignerProtocol, Kafka } from 'kafkajs'
import config from '../config'
import requestsHandler from '../requestsHandler'
import types from '../echo/types'

const HEARTBEAT_INTERVAL_SECONDS = 3

export default async function startService(options) {
  if (options.client) {
    const kafka = new Kafka(options.client)
    const admin = kafka.admin()
    await admin.connect()

    const checkConsumerGroup = async (consumerGroupId) => {
      console.info(`Checking consumer group ${consumerGroupId}`)
      const groupDescriptions = await admin.describeGroups([consumerGroupId])
      const group = groupDescriptions.groups[0]
      if (group.state === 'Empty') return true
      const topics = Object.keys(options.echoes).filter(key => options.echoes[key].type === types.event)
      const topicsMetadata = await admin.fetchTopicMetadata({ topics })
      const maxPartitions = Math.max(...topicsMetadata.topics.map(t => t.partitions.length))
      if (maxPartitions > group.members.length) {
        console.warn(`There are more partitions (${maxPartitions}) than members (${group.members.length}) in the group ${consumerGroupId}`)
        return true
      }
    }

    config.producer = kafka.producer(options.producer)
    const consumers = {}
    for (const [topic, echo] of Object.entries(options.echoes)) {
      if (echo.type !== types.event) continue
      const consumerId = echo.consumerId ? `${options.consumer.groupId}-${echo.consumerId}` : options.consumer.groupId
      if (!consumers[consumerId]) consumers[consumerId] = []
      consumers[consumerId].push(topic)
    }

    console.info('Consumers:', Object.keys(consumers))

    const joinConsumerGroup = async (consumer, topics) => {
      await consumer.connect()
      await consumer.subscribe({ topics })
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


    await config.producer.connect()

    for (const [consumerId, topics] of Object.entries(consumers)) {
      console.info(`Creating consumer ${consumerId} for topics ${topics}`)
      const consumer = kafka.consumer({ groupId: consumerId })
      if (await checkConsumerGroup(consumerId)) {
        console.info(`Joining consumer group inmediately ${consumerId}`)
        await joinConsumerGroup(consumer, topics)
      } else {
        console.info(`The consumer group has enough members, waiting to join ${consumerId}`)
        const interval = setInterval(async () => {
          if (await checkConsumerGroup(consumerId)) {
            console.info(`Joining consumer group after checking ${consumerId}`)
            await joinConsumerGroup(consumer, topics)
            clearInterval(interval)
          }
        }, 5000)
      }
    }


  }
  if (options.requests) {
    config.requests = options.requests

    config.echoes = options.echoes
    if (config.requests.startHandler) {
      config.requests.startHandler(requestsHandler)
    }
  }
}
