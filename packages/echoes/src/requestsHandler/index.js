import getEcho from './getEcho'
import serialize from '../publish/serialize'
import checkSignature from './checkSignature'

export default async function ({getBodyJSON}) {
  try {
    const {body, signature} = await getBodyJSON()

    checkSignature(body, signature)

    const {method, serializedParams} = body

    const echo = getEcho(method)
    const result = await echo.onRequest(serializedParams)

    return {
      result: serialize(result)
    }
  } catch (error) {
    console.error('Error at echo requests handler:', error)

    return {
      error: error.message
    }
  }
}
