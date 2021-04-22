import repeatWithHeaders from './repeatWithHeaders'

export default function ({options, operation, forward}) {
  if (!operation || !forward) return

  return repeatWithHeaders(
    async () => {
      const code = await options.promptTwoFactorCode()
      return {
        'X-ORION-TWOFACTOR': code
      }
    },
    {
      operation,
      forward
    }
  )
}
