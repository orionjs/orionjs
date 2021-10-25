import axios from 'axios'
import getURL from './getURL'
import getSignature from './getSignature'
import serialize from '../publish/serialize'
import deserialize from '../echo/deserialize'
import {RequestHandlerResponse, RequestOptions} from '../options'

export default async function (options: RequestOptions): Promise<any> {
  const {method, service, params} = options
  const serializedParams = serialize(params)
  const date = new Date()
  const body = {method, service, serializedParams, date}
  const signature = getSignature(body)

  try {
    const result = await axios({
      method: 'post',
      url: getURL(service),
      headers: {
        'User-Agent': 'Orionjs-Echoes/1.1'
      },
      data: {
        body,
        signature
      }
    })

    if (result.status !== 200) {
      throw new Error(`Echoes request network error ${result.status}`)
    }

    const data: RequestHandlerResponse = result.data

    if (data.error) {
      throw new Error(`Echoes request error: ${data.error}`)
    }

    const response = deserialize(data.result)
    return response
  } catch (error) {
    throw new Error(`Echoes request network error ${error.message}`)
  }
}
