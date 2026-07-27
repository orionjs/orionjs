import {randomUUID} from 'node:crypto'
import {logger} from '@orion-js/logger'
import {Consumer, EachMessagePayload, Kafka, Producer} from 'kafkajs'
import deserialize from '../echo/deserialize'
import type {
  EventSubscriptionDefinition,
  EventTransport,
  EventTransportStartOptions,
} from '../events/EventTransport'
import serialize from '../publish/serialize'
import type {EchoesKafkaEventsConfig, EchoesReceivedEvent, PublishOptions} from '../types'

const HEARTBEAT_INTERVAL_SECONDS = 5
const CHECK_JOIN_CONSUMER_INTERVAL_SECONDS = 30
const DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY = 4
const DEFAULT_MEMBERS_TO_PARTITIONS_RATIO = 1

/**
 * Kafka event transport. It retains the existing consumer-group and retry behavior.
 */
class KafkaManager implements EventTransport {
  readonly name = 'kafka' as const

  private readonly kafka: Kafka
  private readonly options: EchoesKafkaEventsConfig
  private producer?: Producer
  private consumer?: Consumer
  private topics: string[] = []
  private subscriptions = new Map<string, EventSubscriptionDefinition>()
  private onEvent?: (event: EchoesReceivedEvent) => Promise<void>
  private consumerStarted = false
  private producerConnected = false
  private interval?: NodeJS.Timeout

  constructor(options: EchoesKafkaEventsConfig) {
    this.kafka = new Kafka(options.client)
    this.options = options
  }

  async start(options: EventTransportStartOptions) {
    this.onEvent = options.onEvent
    this.subscriptions = new Map(
      options.subscriptions.map(subscription => [subscription.topic, subscription]),
    )
    this.topics = options.subscriptions.map(subscription => subscription.topic)

    // Kafka retries and DLQ publishing use a producer even on consumer-only servers.
    if (options.publish || options.consume) {
      this.producer = this.kafka.producer(this.options.producer)
      await this.producer.connect()
      this.producerConnected = true
    }

    if (!options.consume || this.topics.length === 0) return
    if (!this.options.consumer?.groupId) {
      throw new Error('Echoes Kafka consumers require consumer.groupId')
    }

    this.consumer = this.kafka.consumer(this.options.consumer)
    this.consumerStarted = await this.conditionalStart()
    if (this.consumerStarted) return

    logger.info('Echoes: Delaying consumer group join, waiting for conditions to be met')
    this.interval = setInterval(async () => {
      this.consumerStarted = await this.conditionalStart()
      if (this.consumerStarted) clearInterval(this.interval)
    }, CHECK_JOIN_CONSUMER_INTERVAL_SECONDS * 1000)
  }

  async publish<TParams = any>(options: PublishOptions<TParams>) {
    if (!this.producer || !this.producerConnected) {
      throw new Error('Echoes Kafka producer is not connected')
    }

    return await this.producer.send({
      acks: options.acks,
      timeout: options.timeout,
      topic: options.topic,
      messages: [
        {
          value: serialize({params: options.params}),
          headers: {
            'echoes-event-id': randomUUID(),
          },
        },
      ],
    })
  }

  async close() {
    logger.warn('Echoes: Stopping Kafka transport')
    if (this.interval) clearInterval(this.interval)
    await Promise.all([
      this.consumer?.disconnect(),
      this.producerConnected ? this.producer?.disconnect() : undefined,
    ])
    this.consumerStarted = false
    this.producerConnected = false
  }

  private async checkJoinConsumerGroupConditions(): Promise<boolean> {
    const admin = this.kafka.admin()
    try {
      await admin.connect()
      const groupId = this.options.consumer.groupId
      const groupDescriptions = await admin.describeGroups([groupId])
      const group = groupDescriptions.groups[0]
      if (group.state === 'Empty') {
        logger.info(`Echoes: Consumer group ${groupId} is empty, joining`)
        return true
      }
      const topicsMetadata = await admin.fetchTopicMetadata({topics: this.topics})
      const totalPartitions = topicsMetadata.topics.reduce(
        (acc, topic) => acc + topic.partitions.length,
        0,
      )
      logger.info(
        `Echoes: Consumer group ${groupId} has ${group.members.length} members and ${totalPartitions} partitions`,
      )
      const partitionsRatio =
        this.options.membersToPartitionsRatio || DEFAULT_MEMBERS_TO_PARTITIONS_RATIO
      const partitionsThreshold = Math.ceil(totalPartitions * partitionsRatio)
      if (partitionsThreshold > group.members.length) {
        logger.info(
          `Echoes: Consumer group ${groupId} has room for more members ${group.members.length}/${partitionsThreshold}, joining`,
        )
        return true
      }
      return false
    } catch (error) {
      logger.error('Echoes: Error checking consumer group conditions, join', {error})
      return true
    } finally {
      await admin.disconnect().catch(error => {
        logger.error('Echoes: Error disconnecting admin client', {error})
      })
    }
  }

  private async joinConsumerGroup() {
    await this.consumer.connect()
    await this.consumer.subscribe({topics: this.topics})
    await this.consumer.run({
      partitionsConsumedConcurrently:
        this.options.partitionsConsumedConcurrently || DEFAULT_PARTITIONS_CONSUMED_CONCURRENTLY,
      eachMessage: params => this.handleMessage(params),
    })
  }

  private async conditionalStart(): Promise<boolean> {
    if (await this.checkJoinConsumerGroupConditions()) {
      await this.joinConsumerGroup()
      return true
    }
    return false
  }

  private async handleMessage(params: EachMessagePayload) {
    const subscription = this.subscriptions.get(params.topic)
    if (!subscription) {
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
      const event = this.createReceivedEvent(params)
      await this.onEvent(event)
    } catch (error) {
      try {
        await this.handleRetries(subscription, params, error as Error)
      } catch (retryError) {
        logger.error('Echoes: error processing a message', {
          error: retryError,
          topic: params.topic,
        })
        throw retryError
      }
    } finally {
      clearInterval(heartbeatInterval)
    }
  }

  private createReceivedEvent(params: EachMessagePayload): EchoesReceivedEvent {
    const {message, topic, partition} = params
    const data = deserialize(message.value.toString())
    const retries = Number.parseInt(message.headers?.retries?.toString() || '0', 10)
    const timestamp = Number.parseInt(message.timestamp || '', 10)

    return {
      id:
        message.headers?.['echoes-event-id']?.toString() ||
        `kafka:${topic}:${partition}:${message.offset}`,
      topic,
      data,
      transport: 'kafka',
      headers: message.headers,
      createdAt: Number.isFinite(timestamp) ? new Date(timestamp) : new Date(),
      attempt: retries + 1,
      context: params,
    }
  }

  private async handleRetries(
    subscription: EventSubscriptionDefinition,
    params: EachMessagePayload,
    error: Error,
  ) {
    const {message, topic} = params
    const retries = Number.parseInt(message?.headers?.retries?.toString() || '0', 10)
    if (
      subscription.attemptsBeforeDeadLetter === undefined ||
      subscription.attemptsBeforeDeadLetter === null
    ) {
      throw error
    }
    const maxRetries = subscription.attemptsBeforeDeadLetter || 0
    const exceededMaxRetries = retries >= maxRetries
    const nextTopic = exceededMaxRetries ? `DLQ-${topic}` : topic
    await this.producer.send({
      topic: nextTopic,
      messages: [
        {
          value: message.value.toString(),
          headers: {
            ...message.headers,
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
