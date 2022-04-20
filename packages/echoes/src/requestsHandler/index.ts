import getEcho from './getEcho'
import serialize from '../publish/serialize'
import checkSignature from './checkSignature'
import {route} from '@orion-js/http'
import {EchoesOptions} from '../types'

export default (options: EchoesOptions) =>
  route({
    method: 'post',
    path: options.requests.handlerPath || '/echoes-services',
    bodyParser: 'json',
    async resolve(req) {
      try {
        const {body, signature} = req.body

        checkSignature(body, signature)

        const {method, serializedParams} = body

        const echo = getEcho(method)
        const result = await echo.onRequest(serializedParams)

        return {
          body: {
            result: serialize(result)
          }
        }
      } catch (error) {
        console.error('Error at echo requests handler:', error)

        return {
          body: {
            error: error.message
          }
        }
      }
    }
  })
