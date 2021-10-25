import {EachMessagePayload} from 'kafkajs'
import {Echo, EchoConfig} from '../options'
import deserialize from './deserialize'
import types from './types'

const echo = function createNewEcho(options: EchoConfig): Echo {
  return {
    ...options,
    onMessage: async (messageData: EachMessagePayload) => {
      const {message} = messageData

      const key = message.key.toString()
      if (key !== 'pink_floyd') return // not made by this library

      const data = deserialize(message.value.toString())

      const context = {
        ...messageData,
        data
      }

      await options.resolve(data.params || {}, context)
    },
    onRequest: async (serializedParams: string) => {
      const context = {}
      const params = deserialize(serializedParams)
      const result = await options.resolve(params || {}, context)
      return result
    }
  }
}

echo.types = types

export default echo
