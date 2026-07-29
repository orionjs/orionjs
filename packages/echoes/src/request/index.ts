import config from '../config'
import deserialize from '../echo/deserialize'
import serialize from '../publish/serialize'
import {createEchoesUserError, createEchoesValidationError} from '../runtime'
import type {
  MakeRequestParams,
  RequestHandlerResponse,
  RequestMaker,
  RequestOptions,
} from '../types'
import getSignature from './getSignature'
import getURL from './getURL'
import {makeRequest} from './makeRequest'

export default async function request<TData = any, TParams = any>(
  options: RequestOptions<TParams>,
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
        signature,
      },
    }
    const result = await requestMaker(requestOptions)

    if (result.statusCode !== 200) {
      throw new Error(`Wrong status code ${result.statusCode}`)
    }

    const data: RequestHandlerResponse = result.data

    if (data.error) {
      const info = data.errorInfo
      if (info) {
        if (data.isValidationError) {
          throw createEchoesValidationError(info)
        }
        if (data.isUserError) {
          throw createEchoesUserError(info)
        }
      }

      throw new Error(`${data.error}`)
    }

    const response = deserialize(data.result)
    return response
  } catch (error) {
    const caught = error as any
    if (caught.isOrionError || caught.isEchoesError) throw caught

    throw new Error(`Echoes request network error calling ${service}/${method}: ${caught.message}`)
  }
}
