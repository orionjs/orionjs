import {clean, cleanAndValidate, InferSchemaType, SchemaFieldType} from '@orion-js/schema'
import {EachMessagePayload} from 'kafkajs'
import {
  EchoConfig,
  EchoEventConfig,
  EchoesReceivedEvent,
  EchoRequestConfig,
  EchoType,
} from '../types'
import deserialize from './deserialize'

/**
 * @deprecated Use createEchoRequest and createEchoEvent instead
 */
const echo = function createNewEcho<
  TParamsSchema extends SchemaFieldType,
  TReturnsSchema extends SchemaFieldType,
  TEchoType extends 'event' | 'request',
>(
  options: EchoConfig<TParamsSchema, TReturnsSchema, TEchoType>,
): EchoType<TParamsSchema, TReturnsSchema, TEchoType> {
  const resolve = async (params: InferSchemaType<TParamsSchema>, context: any) => {
    const cleaned = options.params
      ? await cleanAndValidate(options.params, params)
      : (params ?? ({} as InferSchemaType<TParamsSchema>))

    const result = await options.resolve(cleaned, context)

    if (options.returns) {
      return await clean(options.returns, result)
    }

    return result
  }

  const onEvent = async (event: EchoesReceivedEvent) => {
    const context = {
      ...(event.context || {}),
      transport: event.transport,
      eventId: event.id,
      topic: event.topic,
      headers: event.headers,
      createdAt: event.createdAt,
      attempt: event.attempt,
      data: event.data,
    }

    await resolve(event.data.params, context)
  }

  return {
    type: options.type,
    params: options.params,
    returns: options.returns,
    attemptsBeforeDeadLetter:
      options.type === 'event' ? options.attemptsBeforeDeadLetter : undefined,
    resolve,
    onEvent,
    onMessage: async (messageData: EachMessagePayload) => {
      const {message} = messageData

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
  TParamsSchema extends SchemaFieldType,
  TReturnsSchema extends SchemaFieldType,
>(
  options: EchoRequestConfig<TParamsSchema, TReturnsSchema>,
): EchoType<TParamsSchema, TReturnsSchema, 'request'> {
  return echo({...options, type: 'request'})
}
export function createEchoEvent<
  TParamsSchema extends SchemaFieldType,
  TReturnsSchema extends SchemaFieldType,
>(
  options: EchoEventConfig<TParamsSchema, TReturnsSchema>,
): EchoType<TParamsSchema, TReturnsSchema, 'event'> {
  return echo({...options, type: 'event' as any})
}

export {echo}
