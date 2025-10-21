import {Kafka, EachMessagePayload, Producer, Consumer} from 'kafkajs'
import {EchoesOptions, EchoType} from '../types'
import {logger} from '@orion-js/logger'

const HEARTBEAT_INTERVAL_SECONDS = 5 // This value must be less than the kafkajs session timeout
const CHECK_JOIN_CONSUMER_INTERVAL_SECONDS = 30
const DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY = 4 // How many partitions to consume concurrently, adjust this with the members to partitions ratio to avoid idle consumers.
const DEFAULT_MEMBERS_TO_PARTITIONS_RATIO = 1 // How many members are in comparison to partitions, this is used to determine if the consumer group has room for more members. Numbers over 1 leads to idle consumers. Numbers under 1 needs partitionsConsumedConcurrently to be more than 1.

/**
 * Manages the Kafka connection and the consumers.
 */
class KafkaManager {
  kafka: Kafka
  options: EchoesOptions
  producer: Producer
  consumer: Consumer
  topics: string[]
  started: boolean
  interval: NodeJS.Timeout

  constructor(options: EchoesOptions) {
    this.kafka = new Kafka(options.client)
    this.options = options
    this.producer = this.kafka.producer(options.producer)
    this.consumer = this.kafka.consumer(options.consumer)
    this.topics = Object.keys(options.echoes).filter(key => options.echoes[key].type === 'event')
  }

  async checkJoinConsumerGroupConditions(): Promise<boolean> {
    const admin = this.kafka.admin()
    try {
      await admin.connect()
      const groupDescriptions = await admin.describeGroups([this.options.consumer.groupId])
      const group = groupDescriptions.groups[0]
      if (group.state === 'Empty') {
        logger.info(`Echoes: Consumer group ${this.options.consumer.groupId} is empty, joining`)
        return true
      }
      const topicsMetadata = await admin.fetchTopicMetadata({topics: this.topics})
      const totalPartitions = topicsMetadata.topics.reduce(
        (acc, topic) => acc + topic.partitions.length,
        0,
      )
      logger.info(
        `Echoes: Consumer group ${this.options.consumer.groupId} has ${group.members.length} members and ${totalPartitions} partitions`,
      )
      const partitionsRatio =
        this.options.membersToPartitionsRatio || DEFAULT_MEMBERS_TO_PARTITIONS_RATIO
      const partitionsThreshold = Math.ceil(totalPartitions * partitionsRatio)
      if (partitionsThreshold > group.members.length) {
        logger.info(
          `Echoes: Consumer group ${this.options.consumer.groupId} has room for more members ${group.members.length}/${partitionsThreshold}, joining`,
        )
        return true
      }
    } catch (error) {
      logger.error('Echoes: Error checking consumer group conditions, join', {error})
      return true
    } finally {
      await admin.disconnect().catch(error => {
        logger.error('Echoes: Error disconnecting admin client', {error})
      })
    }
  }

  async joinConsumerGroup() {
    await this.consumer.connect()
    await this.consumer.subscribe({topics: this.topics})
    await this.consumer.run({
      partitionsConsumedConcurrently:
        this.options.partitionsConsumedConcurrently || DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY,
      eachMessage: params => this.handleMessage(params),
    })
  }

  async conditionalStart(): Promise<boolean> {
    if (await this.checkJoinConsumerGroupConditions()) {
      await this.joinConsumerGroup()
      return true
    }
  }

  async start() {
    if (this.started) return
    await this.producer.connect()
    this.started = await this.conditionalStart()
    if (this.started) return
    logger.info('Echoes: Delaying consumer group join, waiting for conditions to be met')
    this.interval = setInterval(async () => {
      this.started = await this.conditionalStart()
      if (this.started) clearInterval(this.interval)
    }, CHECK_JOIN_CONSUMER_INTERVAL_SECONDS * 1000)
  }

  async stop() {
    logger.warn('Echoes: Stopping echoes')
    if (this.interval) clearInterval(this.interval)
    if (this.consumer) await this.consumer.disconnect()
    if (this.producer) await this.producer.disconnect()
  }

  async handleMessage(params: EachMessagePayload) {
    const echo = this.options.echoes[params.topic]
    if (!echo || echo.type !== 'event') {
      logger.warn(`Echoes: Received a message for an unknown topic: ${params.topic}, ignoring it`)
      return
    }

    let intervalsCount = 0
    const heartbeatInterval = setInterval(async () => {
      await params.heartbeat().catch(error => {
        logger.warn(`Echoes: Error sending heartbeat: ${error.message}`)
      })
      intervalsCount++
      if ((intervalsCount * HEARTBEAT_INTERVAL_SECONDS) % 30 === 0) {
        logger.warn(
          `Echoes: Event is taking too long to process: ${params.topic} ${intervalsCount * HEARTBEAT_INTERVAL_SECONDS}s`,
        )
      }
    }, HEARTBEAT_INTERVAL_SECONDS * 1000)

    try {
      await echo.onMessage(params).catch(error => this.handleRetries(echo, params, error))
    } catch (error) {
      logger.error('Echoes: error processing a message', {error, topic: params.topic})
      throw error
    } finally {
      clearInterval(heartbeatInterval)
    }
  }

  async handleRetries(echo: EchoType, params: EachMessagePayload, error: Error) {
    const {message, topic} = params
    const retries = Number.parseInt(message?.headers?.retries?.toString() || '0', 10)
    if (echo.attemptsBeforeDeadLetter === undefined || echo.attemptsBeforeDeadLetter === null) {
      throw error
    }
    const maxRetries = echo.attemptsBeforeDeadLetter || 0
    const exceededMaxRetries = retries >= maxRetries
    const nextTopic = exceededMaxRetries ? `DLQ-${topic}` : topic
    await this.producer.send({
      topic: nextTopic,
      messages: [
        {
          value: message.value.toString(),
          headers: {
            retries: String(retries + 1),
            error: error.message,
          },
        },
      ],
    })

    if (exceededMaxRetries) {
      logger.error(
        'Echoes: a message has reached the maximum number of retries, sending it to DLQ',
        {topic: nextTopic},
      )
    } else {
      logger.warn('Echoes: a retryable message failed', {error, topic: nextTopic})
    }
  }
}

export default KafkaManager
