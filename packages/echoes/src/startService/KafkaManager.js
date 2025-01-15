import { Kafka } from 'kafkajs'
import types from '../echo/types'

const HEARTBEAT_INTERVAL_SECONDS = 5
const CHECK_JOIN_CONSUMER_INTERVAL_SECONDS = 30

class KafkaManager {
  constructor(options) {
    this.kafka = new Kafka(options.client)
    this.options = options
    this.producer = this.kafka.producer(options.producer)
    this.consumer = this.kafka.consumer({ groupId: options.consumer.groupId })
    this.topics = Object.keys(options.echoes).filter(key => options.echoes[key].type === types.event)
  }

  async checkJoinConsumerGroupConditions() {
    const admin = this.kafka.admin()
    await admin.connect()
    const groupDescriptions = await admin.describeGroups([this.options.consumer.groupId])
    const group = groupDescriptions.groups[0]
    if (group.state === 'Empty') {
      console.info(`Echoes: Consumer group ${this.options.consumer.groupId} is empty`)
      return true
    }
    const topicsMetadata = await admin.fetchTopicMetadata({ topics: this.topics })
    const totalPartitions = topicsMetadata.topics.reduce((acc, t) => acc + t.partitions.length, 0)
    console.info(`Echoes: Consumer group ${this.options.consumer.groupId} has ${group.members.length} members and ${totalPartitions} partitions`)
    if (totalPartitions > group.members.length) {
      return true
    }
    await admin.disconnect()
  }

  async joinConsumerGroup() {
    await this.consumer.connect()
    await this.consumer.subscribe({ topics: this.topics })
    this.consumer.run({
      partitionsConsumedConcurrently: this.options.partitionsConsumedConcurrently || 4,
      eachMessage: (params) => this.handleMessage(params),
    })
  }

  async conditionalStart() {
    if (await this.checkJoinConsumerGroupConditions()) {
      await this.joinConsumerGroup()
      return true
    }
  }

  async start() {
    if (this.started) return
    await this.producer.connect()
    console.info("PRODUCER CONNECTED")
    this.started = await this.conditionalStart()
    if (this.started) return
    console.info('Echoes: Delaying consumer group join, waiting for conditions to be met')
    this.interval = setInterval(async () => {
      this.started = await this.conditionalStart()
      if (this.started) clearInterval(this.interval)
    }, CHECK_JOIN_CONSUMER_INTERVAL_SECONDS * 1000)
  }

  async stop() {
    console.warn("Echoes: Stopping echoes")
    if (this.interval) {
      clearInterval(this.interval)
    }
    if (this.consumer) {
      await this.consumer.disconnect()
    }
    if (this.producer) {
      await this.producer.disconnect()
    }
  }

  async handleMessage(params) {
    const echo = this.options.echoes[params.topic]
    if (!echo || echo.type !== types.event) {
      console.warn(`Echoes: Received a message for an unknown topic: ${params.topic}, ignoring it`)
    }

    let intervalsCount = 0
    const hInterval = setInterval(async () => {
      await params.heartbeat().catch(error => {
        console.warn('Echoes: Error sending heartbeat:', error)
      })
      intervalsCount++
      if (intervalsCount % 10 === 0) {
        console.warn(`Echoes: Event ${params.topic} is taking too long to process: ${intervalsCount * HEARTBEAT_INTERVAL_SECONDS}s`)
      }
    }, HEARTBEAT_INTERVAL_SECONDS * 1000)

    try {
      await echo.onMessage(params)
        .catch(error => this.handleRetries(echo, params, error))
    } catch (error) {
      console.error('Echoes: error processing message:', { error, params })
      throw error
    } finally {
      clearInterval(hInterval)
    }
  }

  async handleRetries(echo, params, error) {
    const { message, topic } = params
    const retries = getRetries(message)
    if (echo.attemptsBeforeDeadLetter === undefined || echo.attemptsBeforeDeadLetter === null) {
      throw error
    }
    const maxRetries = echo.attemptsBeforeDeadLetter || 0
    const execededMaxRetries = retries >= maxRetries
    const nextTopic = execededMaxRetries ? `DLQ-${topic}` : topic
    await this.producer.send({
      topic: nextTopic,
      messages: [{
        value: message.value.toString(),
        headers: {
          retries: String(retries + 1),
          errorMessage: error.message
        }
      }]
    })
    if (execededMaxRetries) {
      console.error(`Echoes: a message has reached the maximum number of retries, sending it to DLQ: ${nextTopic}`)
    } else {
      console.warn(`Echoes: a retryable message failed "${error.message}", re-sending it to topic: ${nextTopic}`)
    }
  }
}

function getRetries(message) {
  if (!message || !message.headers || !message.headers.retries) return 0
  return Number.parseInt(message.headers.retries.toString())
}

export default KafkaManager