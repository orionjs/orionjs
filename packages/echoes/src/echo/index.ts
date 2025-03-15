import {EachMessagePayload} from 'kafkajs'
import {EchoType, EchoConfig, EchoRequestConfig, EchoEventConfig} from '../types'
import deserialize from './deserialize'
import types from './types'
import {cleanAndValidate, InferSchemaType} from '@orion-js/schema'
import {SchemaFieldType} from '@orion-js/schema'

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

    return options.resolve(cleaned, context)
  }

  return {
    type: options.type,
    params: options.params,
    returns: options.returns,
    attemptsBeforeDeadLetter:
      options.type === 'event' ? options.attemptsBeforeDeadLetter : undefined,
    resolve,
    onMessage: async (messageData: EachMessagePayload) => {
      const {message} = messageData

      const data = deserialize(message.value.toString())

      const context = {
        ...messageData,
        data,
      }

      await resolve(data.params, context)
    },
    onRequest: async (serializedParams: string) => {
      const context = {}
      const params = deserialize(serializedParams)

      return await resolve(params, context)
    },
  }
}

echo.types = types

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
