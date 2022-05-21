import getURL from './getURL'
import getSignature from './getSignature'
import serialize from '../publish/serialize'
import deserialize from '../echo/deserialize'
import {RequestHandlerResponse, RequestMaker, RequestOptions} from '../types'
import config from '../config'
import {makeRequest} from './makeRequest'

export default async function (options: RequestOptions): Promise<any> {
  const {method, service, params} = options
  const serializedParams = serialize(params)
  const date = new Date()
  const body = {method, service, serializedParams, date}
  const signature = getSignature(body)

  try {
    const requestMaker: RequestMaker = config?.requests?.makeRequest || makeRequest
    const requestOptions = {
      url: getURL(service),
      data: {
        body,
        signature
      }
    }
    const result = await requestMaker(requestOptions)

    if (result.statusCode !== 200) {
      throw new Error(`Echoes request network error ${result.statusCode}`)
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
