import {getEchoesLogger} from '../runtime'
import type {
  EchoesEventTransportName,
  EchoesMap,
  EchoesReceivedEvent,
  PublishOptions,
} from '../types'
import type {EventSubscriptionDefinition, EventTransport} from './EventTransport'

export interface EventBusOptions {
  echoes: EchoesMap
  transports: Partial<Record<EchoesEventTransportName, EventTransport>>
  consumeFrom: EchoesEventTransportName[]
  publishTo?: EchoesEventTransportName
}

export default class EventBus {
  private readonly echoes: EchoesMap
  private readonly transports: Partial<Record<EchoesEventTransportName, EventTransport>>
  private readonly consumeFrom: EchoesEventTransportName[]
  private readonly publishTo?: EchoesEventTransportName
  private readonly startedTransports: EventTransport[] = []
  private started = false
  private closed = false

  constructor(options: EventBusOptions) {
    this.echoes = options.echoes
    this.transports = options.transports
    this.consumeFrom = [...new Set(options.consumeFrom)]
    this.publishTo = options.publishTo
  }

  async start() {
    if (this.started) return

    const selected = new Set(this.consumeFrom)
    if (this.publishTo) selected.add(this.publishTo)

    for (const name of selected) {
      if (!this.transports[name]) {
        throw new Error(`Echoes event transport "${name}" is selected but not configured`)
      }
    }

    const subscriptions: EventSubscriptionDefinition[] = Object.entries(this.echoes)
      .filter(([, echo]) => echo.type === 'event')
      .map(([topic, echo]) => ({
        topic,
        attemptsBeforeDeadLetter: echo.attemptsBeforeDeadLetter,
        configVersion: echo.configVersion,
        maxConcurrency: echo.maxConcurrency,
        receiverMode: echo.receiverMode ?? 'single',
        batchSize: echo.batchSize ?? 1,
      }))

    if (
      this.consumeFrom.includes('kafka') &&
      subscriptions.some(subscription => subscription.receiverMode === 'batch')
    ) {
      throw new Error('Echoes batch event receivers are supported only by the Pulse transport.')
    }

    try {
      for (const name of selected) {
        const transport = this.transports[name]
        this.startedTransports.push(transport)
        await transport.start({
          consume: this.consumeFrom.includes(name),
          publish: this.publishTo === name,
          subscriptions,
          onEvent: event => this.handleEvent(event),
          onEvents: events => this.handleEvents(events),
        })
      }
      this.started = true
    } catch (error) {
      await this.close().catch(() => undefined)
      throw error
    }
  }

  async publish<TParams = any>(options: PublishOptions<TParams>) {
    if (!this.started) {
      throw new Error('You must initialize echoes configuration to use publish')
    }
    if (!this.publishTo) {
      throw new Error('Echoes does not have a publish transport configured')
    }

    return await this.transports[this.publishTo].publish(options)
  }

  async close() {
    if (this.closed) return
    this.closed = true
    await Promise.all(this.startedTransports.map(transport => transport.close()))
  }

  private async handleEvent(event: EchoesReceivedEvent) {
    const logger = getEchoesLogger()
    const echo = this.echoes[event.topic]
    if (!echo || echo.type !== 'event') {
      logger.warn(`Echoes: Received a message for an unknown topic: ${event.topic}, ignoring it`)
      return
    }

    // Preserve the exact legacy Kafka entrypoint for custom EchoType implementations.
    if (event.transport === 'kafka' && event.context) {
      await echo.onMessage(event.context as any)
      return
    }

    if (echo.onEvent) {
      await echo.onEvent(event)
      return
    }

    await echo.resolve(event.data.params, {
      ...(event.context || {}),
      transport: event.transport,
      eventId: event.id,
      topic: event.topic,
      headers: event.headers,
      createdAt: event.createdAt,
      attempt: event.attempt,
      data: event.data,
    })
  }

  private async handleEvents(events: EchoesReceivedEvent[]) {
    if (events.length === 0) return
    const echo = this.echoes[events[0].topic]
    if (echo?.type === 'event' && echo.onEvents) {
      await echo.onEvents(events)
      return
    }
    for (const event of events) await this.handleEvent(event)
  }
}
