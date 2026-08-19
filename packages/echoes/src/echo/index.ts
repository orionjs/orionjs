import {cleanEchoesSchema, parseEchoesSchema} from '../runtime'
import type {EchoesSchema, InferEchoesSchema} from '../schema'
import {
  EchoBatchEventConfig,
  EchoBatchItem,
  EchoConfig,
  EchoEventConfig,
  EchoesKafkaMessagePayload,
  EchoesReceivedEvent,
  EchoRequestConfig,
  EchoType,
} from '../types'
import deserialize from './deserialize'

function receivedEventContext(event: EchoesReceivedEvent) {
  return {
    ...(event.context || {}),
    transport: event.transport,
    eventId: event.id,
    topic: event.topic,
    headers: event.headers,
    createdAt: event.createdAt,
    attempt: event.attempt,
    data: event.data,
  }
}

/**
 * @deprecated Use createEchoRequest and createEchoEvent instead
 */
const echo = function createNewEcho<
  TParamsSchema extends EchoesSchema,
  TReturnsSchema extends EchoesSchema,
  TEchoType extends 'event' | 'request',
>(
  options: EchoConfig<TParamsSchema, TReturnsSchema, TEchoType>,
): EchoType<TParamsSchema, TReturnsSchema, TEchoType> {
  const resolve = async (params: InferEchoesSchema<TParamsSchema>, context: any) => {
    const cleaned = options.params
      ? await parseEchoesSchema<InferEchoesSchema<TParamsSchema>>(options.params, params)
      : (params ?? ({} as InferEchoesSchema<TParamsSchema>))

    const result = await options.resolve(cleaned, context)

    if (options.returns) {
      return await cleanEchoesSchema<InferEchoesSchema<TReturnsSchema>>(options.returns, result)
    }

    return result
  }

  const onEvent = async (event: EchoesReceivedEvent) => {
    await resolve(event.data.params, receivedEventContext(event))
  }

  return {
    type: options.type,
    params: options.params,
    returns: options.returns,
    attemptsBeforeDeadLetter:
      options.type === 'event' ? options.attemptsBeforeDeadLetter : undefined,
    configVersion:
      options.type === 'event'
        ? (options as EchoEventConfig<TParamsSchema, TReturnsSchema>).configVersion
        : undefined,
    maxConcurrency:
      options.type === 'event'
        ? (options as EchoEventConfig<TParamsSchema, TReturnsSchema>).maxConcurrency
        : undefined,
    receiverMode: options.type === 'event' ? 'single' : undefined,
    batchSize: options.type === 'event' ? 1 : undefined,
    resolve,
    onEvent,
    onMessage: async (messageData: EchoesKafkaMessagePayload) => {
      const {message} = messageData
      if (!message.value) {
        throw new Error(`Echoes received an empty Kafka message for ${messageData.topic}`)
      }

      const data = deserialize(message.value.toString())
      const retries = Number.parseInt(message.headers?.retries?.toString() || '0', 10)
      const timestamp = Number(message.timestamp)
      const createdAt = Number.isFinite(timestamp) ? new Date(timestamp) : new Date()
      const eventId =
        message.headers?.['echoes-event-id']?.toString() ||
        `kafka:${messageData.topic}:${messageData.partition}:${message.offset}`

      await onEvent({
        id: eventId,
        topic: messageData.topic,
        data,
        transport: 'kafka',
        headers: message.headers,
        createdAt,
        attempt: retries + 1,
        context: messageData,
      })
    },
    onRequest: async (serializedParams: string) => {
      const context = {}
      const params = deserialize(serializedParams)

      return await resolve(params, context)
    },
  }
}

export function createEchoRequest<
  TParamsSchema extends EchoesSchema,
  TReturnsSchema extends EchoesSchema,
>(
  options: EchoRequestConfig<TParamsSchema, TReturnsSchema>,
): EchoType<TParamsSchema, TReturnsSchema, 'request'> {
  return echo({...options, type: 'request'})
}
export function createEchoEvent<
  TParamsSchema extends EchoesSchema,
  TReturnsSchema extends EchoesSchema,
>(
  options: EchoEventConfig<TParamsSchema, TReturnsSchema>,
): EchoType<TParamsSchema, TReturnsSchema, 'event'> {
  return echo({...options, type: 'event' as any})
}

export function createEchoBatchEvent<TParamsSchema extends EchoesSchema = any>(
  options: EchoBatchEventConfig<TParamsSchema>,
): EchoType<TParamsSchema, any, 'event'> {
  if (!Number.isInteger(options.batchSize) || options.batchSize <= 0) {
    throw new Error('batchSize must be a positive integer.')
  }

  const resolveBatch = async (
    events: EchoBatchItem<InferEchoesSchema<TParamsSchema>>[],
  ): Promise<void> => {
    const cleaned = await Promise.all(
      events.map(async event => ({
        params: options.params
          ? await parseEchoesSchema<InferEchoesSchema<TParamsSchema>>(options.params, event.params)
          : (event.params ?? ({} as InferEchoesSchema<TParamsSchema>)),
        context: event.context,
      })),
    )
    await options.resolveBatch(cleaned)
  }

  const onEvents = async (events: EchoesReceivedEvent[]) => {
    await resolveBatch(
      events.map(event => ({
        params: event.data.params,
        context: receivedEventContext(event),
      })),
    )
  }

  return {
    type: 'event',
    params: options.params,
    attemptsBeforeDeadLetter: options.attemptsBeforeDeadLetter,
    configVersion: options.configVersion,
    maxConcurrency: options.maxConcurrency,
    receiverMode: 'batch',
    batchSize: options.batchSize,
    resolve: async (params, context) => {
      await resolveBatch([{params, context: context ?? {}}])
      return undefined
    },
    resolveBatch,
    onEvent: async event => await onEvents([event]),
    onEvents,
    onMessage: async () => {
      throw new Error('Echoes batch event receivers are supported only by the Pulse transport.')
    },
    onRequest: async () => {
      throw new Error('Echoes batch events cannot be invoked as requests.')
    },
  }
}

export {echo}
