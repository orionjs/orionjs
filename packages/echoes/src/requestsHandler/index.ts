import serialize from '../publish/serialize'
import {getEchoesLogger} from '../runtime'
import {EchoesOptions} from '../types'
import checkSignature from './checkSignature'
import getEcho from './getEcho'

export default (options: EchoesOptions) =>
  ({
    method: 'post',
    path: options.requests.handlerPath || '/echoes-services',
    bodyLimit: '10mb',
    async handle(requestBody: any) {
      try {
        const {body, signature} = requestBody

        checkSignature(body, signature)

        const {method, serializedParams} = body

        const echo = getEcho(method)
        const result = await echo.onRequest(serializedParams)

        return {result: serialize(result)}
      } catch (error) {
        const caught = error as any
        if (!caught.getInfo) {
          getEchoesLogger().error('Error at echo requests handler:', {error: caught})
        }

        return {
          error: caught.message,
          errorInfo: caught.getInfo ? caught.getInfo() : null,
          isValidationError: !!caught.isValidationError,
          isUserError: !!caught.isUserError,
        }
      }
    },
  }) as const
