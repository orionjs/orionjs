import deserialize from './deserialize'

export default function (options) {
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

      await options.resolve(data.params, context)
    }
  }
}
