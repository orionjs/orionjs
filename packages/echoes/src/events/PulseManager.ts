import type {
  Pulse,
  PulseReceivedEvent,
  PulseSubscribeOptions,
  PulseSubscription,
} from '@orion-js/pulse'
import type {
  EchoesEventPayload,
  EchoesPulseEventsConfig,
  EchoesReceivedEvent,
  PublishOptions,
} from '../types'
import type {EventTransport, EventTransportStartOptions} from './EventTransport'

type EchoesPulseEventMap = Record<string, EchoesEventPayload>

export default class PulseManager implements EventTransport {
  readonly name = 'pulse' as const

  private readonly options: EchoesPulseEventsConfig
  private pulse?: Pulse<EchoesPulseEventMap>
  private subscriptions: PulseSubscription[] = []

  constructor(options: EchoesPulseEventsConfig) {
    this.options = options
  }

  async start(options: EventTransportStartOptions) {
    let pulseModule: typeof import('@orion-js/pulse')
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
    this.pulse = pulseModule.connect<EchoesPulseEventMap>(connectOptions)
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

  private createReceivedEvent(
    event: PulseReceivedEvent<string, EchoesEventPayload>,
  ): EchoesReceivedEvent {
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
