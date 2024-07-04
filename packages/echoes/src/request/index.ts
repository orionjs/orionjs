import getURL from './getURL'
import getSignature from './getSignature'
import serialize from '../publish/serialize'
import deserialize from '../echo/deserialize'
import type {
  MakeRequestParams,
  RequestHandlerResponse,
  RequestMaker,
  RequestOptions,
} from '../types'
import config from '../config'
import {makeRequest} from './makeRequest'
import {ValidationError} from '@orion-js/schema'
import {UserError} from '@orion-js/helpers'

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
          throw new ValidationError(info.validationErrors)
        }
        if (data.isUserError) {
          throw new UserError(info.error, info.message, info.extra)
        }
      }

      throw new Error(`${data.error}`)
    }

    const response = deserialize(data.result)
    return response
  } catch (error) {
    if (error.isOrionError) throw error

    throw new Error(`Echoes request network error calling ${service}/${method}: ${error.message}`)
  }
}
