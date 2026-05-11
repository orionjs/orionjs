import getURL from './getURL'
import getSignature from './getSignature'
import serialize from '../publish/serialize'
import deserialize from '../echo/deserialize'
import {ValidationError} from '@orion-js/schema'
import UserError from './UserError'
import makeRequest from './makeRequest'

export default async function ({method, service, params, retries, timeout}) {
  const serializedParams = serialize(params)
  const date = new Date()
  const body = {method, service, serializedParams, date}
  const signature = getSignature(body)

  try {
    const result = await makeRequest({
      url: getURL(service),
      data: {body, signature},
      timeout,
      retries
    })

    if (result.statusCode !== 200) {
      throw new Error(`${result.statusCode}`)
    }

    if (result.data.error) {
      const info = result.data.errorInfo
      if (info) {
        if (result.data.isValidationError) {
          throw new ValidationError(info.validationErrors)
        }
        if (result.data.isUserError) {
          throw new UserError(info.error, info.message, info.extra)
        }
      }

      throw new Error(`${result.data.error}`)
    }

    const response = deserialize(result.data.result)
    return response
  } catch (error) {
    if (error.isOrionError) throw error

    throw new Error(`Echoes request network error ${error.message}`)
  }
}
