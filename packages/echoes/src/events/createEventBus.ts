import KafkaManager from '../startService/KafkaManager'
import type {
  EchoesEventTransportName,
  EchoesKafkaEventsConfig,
  EchoesOptions,
  EchoesPulseEventsConfig,
} from '../types'
import EventBus from './EventBus'
import type {EventTransport} from './EventTransport'
import PulseManager from './PulseManager'

export interface ResolvedEventsConfig {
  kafka?: EchoesKafkaEventsConfig
  pulse?: EchoesPulseEventsConfig
  consumeFrom: EchoesEventTransportName[]
  publishTo?: EchoesEventTransportName
}

export function resolveEventsConfig(options: EchoesOptions): ResolvedEventsConfig | undefined {
  const legacyKafka = options.client
    ? {
        client: options.client,
        producer: options.producer,
        consumer: options.consumer,
        readTopicsFromBeginning: options.readTopicsFromBeginning,
        partitionsConsumedConcurrently: options.partitionsConsumedConcurrently,
        membersToPartitionsRatio: options.membersToPartitionsRatio,
      }
    : undefined

  const kafka = options.events?.kafka || legacyKafka
  const pulse = options.events?.pulse

  if (!kafka && !pulse && !options.events) return undefined

  const defaultTransport: EchoesEventTransportName | undefined = kafka
    ? 'kafka'
    : pulse
      ? 'pulse'
      : undefined

  return {
    kafka,
    pulse,
    consumeFrom: options.events?.consumeFrom || (defaultTransport ? [defaultTransport] : []),
    publishTo: options.events?.publishTo || defaultTransport,
  }
}

export default function createEventBus(options: EchoesOptions) {
  const resolved = resolveEventsConfig(options)
  if (!resolved) return undefined

  const transports: Partial<Record<EchoesEventTransportName, EventTransport>> = {}
  if (resolved.kafka) transports.kafka = new KafkaManager(resolved.kafka)
  if (resolved.pulse) transports.pulse = new PulseManager(resolved.pulse)

  return new EventBus({
    echoes: options.echoes,
    transports,
    consumeFrom: resolved.consumeFrom,
    publishTo: resolved.publishTo,
  })
}
