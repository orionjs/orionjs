import deserialize from './deserialize'
import types from './types'

const echo = function (options) {
  return {
    ...options,
    onMessage: async messageData => {
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
    onRequest: async serializedParams => {
      const context = {}
      const params = deserialize(serializedParams)
      const result = await options.resolve(params || {}, context)
      return result
    }
  }
}

echo.types = types

export default echo
