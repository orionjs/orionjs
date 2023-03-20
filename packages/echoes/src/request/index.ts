import getURL from './getURL'
import getSignature from './getSignature'
import serialize from '../publish/serialize'
import deserialize from '../echo/deserialize'
import {MakeRequestParams, RequestHandlerResponse, RequestMaker, RequestOptions} from '../types'
import config from '../config'
import {makeRequest} from './makeRequest'

export default async function request<TData = any, TParams = any>(
  options: RequestOptions<TParams>
): Promise<TData> {
  const {method, service, params} = options
  const serializedParams = serialize(params)
  const date = new Date()
  const body = {method, service, serializedParams, date}
  const signature = getSignature(body)

  try {
    const requestMaker: RequestMaker = config?.requests?.makeRequest || makeRequest
    const requestOptions: MakeRequestParams = {
      url: getURL(service),
      retries: options.retries,
      timeout: options.timeout,
      data: {
        body,
        signature
      }
    }
    const result = await requestMaker(requestOptions)

    if (result.statusCode !== 200) {
      throw new Error(
        `Echoes request network error calling ${service}/${method}: Wrong status code ${result.statusCode}`
      )
    }

    const data: RequestHandlerResponse = result.data

    if (data.error) {
      throw new Error(`Echoes request error calling ${service}/${method}: ${data.error}`)
    }

    const response = deserialize(data.result)
    return response
  } catch (error) {
    throw new Error(`Echoes request network error calling ${service}/${method}: ${error.message}`)
  }
}
