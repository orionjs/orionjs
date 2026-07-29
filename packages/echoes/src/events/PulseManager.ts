import type {
  EchoesEventPayload,
  EchoesPulseEventsConfig,
  EchoesReceivedEvent,
  PublishOptions,
} from '../types'
import type {EventTransport, EventTransportStartOptions} from './EventTransport'

type PulseSubscribeOptions = NonNullable<EchoesPulseEventsConfig['subscription']>

interface PulseReceivedEvent {
  id: string
  topic: string
  data: EchoesEventPayload
  headers?: Record<string, unknown>
  createdAt: Date
  attempt: number
}

export default class PulseManager implements EventTransport {
  readonly name = 'pulse' as const

  private readonly options: EchoesPulseEventsConfig
  private pulse?: any
  private subscriptions: Array<{unsubscribe(): Promise<void>}> = []

  constructor(options: EchoesPulseEventsConfig) {
    this.options = options
  }

  async start(options: EventTransportStartOptions) {
    let pulseModule: any
    try {
      pulseModule = await import('@orion-js/pulse')
    } catch (error) {
      const wrapped = new Error(
        'Echoes Pulse transport requires @orion-js/pulse to be installed in the application',
      )
      ;(wrapped as any).cause = error
      throw wrapped
    }

    const {subscription, ...connectOptions} = this.options
    this.pulse = pulseModule.connect(connectOptions)
    await this.pulse.awaitConnection()

    if (!options.consume) return

    this.subscriptions = await Promise.all(
      options.subscriptions.map(definition =>
        this.pulse.subscribe(
          definition.topic,
          event => options.onEvent(this.createReceivedEvent(event)),
          this.getSubscribeOptions(subscription, definition.attemptsBeforeDeadLetter),
        ),
      ),
    )
  }

  async publish<TParams = any>(options: PublishOptions<TParams>) {
    if (!this.pulse) {
      throw new Error('Echoes Pulse client is not connected')
    }

    return await this.pulse.publish({
      topic: options.topic,
      data: {params: options.params},
    })
  }

  async close() {
    await this.pulse?.close()
    this.subscriptions = []
  }

  private getSubscribeOptions(
    defaults: PulseSubscribeOptions = {},
    attemptsBeforeDeadLetter?: number,
  ): PulseSubscribeOptions {
    return {
      ...defaults,
      ...(attemptsBeforeDeadLetter === undefined ? {} : {maxRetries: attemptsBeforeDeadLetter}),
    }
  }

  private createReceivedEvent(event: PulseReceivedEvent): EchoesReceivedEvent {
    return {
      id: event.id,
      topic: event.topic,
      data: event.data,
      transport: 'pulse',
      headers: event.headers,
      createdAt: event.createdAt,
      attempt: event.attempt,
      context: event,
    }
  }
}
